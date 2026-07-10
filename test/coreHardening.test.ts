import { describe, expect, it } from 'vitest';
import {
  buildVizSpec,
  buildHostRendererInvocation,
  CORTEXEL_JSON_LIMITS,
  CORTEXEL_SPEC_VERSION,
  PARAM_LIMITS,
  getExamplePayload,
  getSkill,
  routeToScene,
  validateSkillInvocation,
  validateSkillParams,
  validateHostRendererInvocation,
  validateHostRendererSpec,
  validateSpec,
  validateVizSpec,
} from '../core';

const spikeInputs = {
  recorder_id: 'sr_1',
  sender_ids: '[1,2]',
  population_labels: 'E',
  time_units: 'ms',
};

function spikeParams(extra: Record<string, unknown> = {}) {
  return { times_ms: [1, 2], senders: [1, 2], ...extra };
}

describe('public agent boundaries never trust JavaScript object prototypes', () => {
  it.each(['__proto__', 'constructor', 'toString'])('rejects inherited skill id %s', (id) => {
    expect(() => validateSkillInvocation(id, {})).not.toThrow();
    expect(validateSkillInvocation(id, {}).ok).toBe(false);
    expect(getSkill(id)).toBeUndefined();
    expect(getExamplePayload(id)).toBeUndefined();
  });

  it('bounds discriminator work before trimming hostile whitespace strings', () => {
    const huge = ' '.repeat(200_000);
    expect(validateSpec({ skill: huge }).ok).toBe(false);
    expect(validateHostRendererSpec({ skill: huge }).ok).toBe(false);
  });

  it('keeps registry contracts immutable and repair examples defensive', () => {
    const contract = getSkill('nest.spike_raster')!;
    expect(Object.isFrozen(contract)).toBe(true);
    expect(Object.isFrozen(contract.requiredProvenanceKeys)).toBe(true);

    const first = getExamplePayload('nest.spike_raster')!;
    first.params.times_ms = [999];
    const second = getExamplePayload('nest.spike_raster')!;
    expect(second.params.times_ms).toEqual([1, 2, 3]);
  });

  it('fails closed for malformed route input and discriminators without throwing', () => {
    for (const input of [
      null,
      { deviceFamily: '__proto__' },
      { deviceFamily: 'spike_recorder', dataShape: { kind: 'bogus' } },
      { deviceFamily: 'weight_recorder', skill: 'nest.spike_raster' },
    ]) {
      expect(() => routeToScene(input)).not.toThrow();
      expect(routeToScene(input).ok).toBe(false);
    }
    expect(
      routeToScene({
        deviceFamily: 'weight_recorder',
        skill: 'nest.spike_raster',
      }),
    ).toMatchObject({ ok: false, reason: 'skill_family_mismatch' });
  });

  it('routes from one snapshot of each untrusted discriminator', () => {
    let reads = 0;
    const changingSkill = new Proxy(
      {
        deviceFamily: 'get_connections',
        skill: 'nest.connectivity_matrix',
      },
      {
        get(target, key, receiver) {
          if (key === 'skill') {
            reads += 1;
            return reads <= 1
              ? 'nest.connectivity_matrix'
              : 'nest.spike_raster';
          }
          return Reflect.get(target, key, receiver);
        },
      },
    );
    expect(routeToScene(changingSkill)).toEqual({
      ok: true,
      skill: 'nest.connectivity_matrix',
      scene: 'network-topology',
    });
    expect(reads).toBe(0);
    expect(
      routeToScene({ deviceFamily: 'get_connections', skil: 'nest.spike_raster' }),
    ).toMatchObject({ ok: false, reason: 'invalid_input', field: 'skil' });
  });

  it('fails closed when hostile route objects throw while being inspected or printed', () => {
    const hostileInput = new Proxy(
      {},
      {
        get() {
          throw new Error('hostile getter');
        },
      },
    );
    const hostileValue = {
      [Symbol.toPrimitive]() {
        throw new Error('hostile coercion');
      },
    };

    expect(() => routeToScene(hostileInput)).not.toThrow();
    expect(routeToScene(hostileInput)).toMatchObject({ ok: false, reason: 'invalid_input' });
    expect(() => routeToScene({ deviceFamily: hostileValue })).not.toThrow();
    expect(routeToScene({ deviceFamily: hostileValue })).toMatchObject({
      ok: false,
      reason: 'unknown_family',
    });
  });

  it('never re-throws while formatting a hostile thrown Proxy', () => {
    const toxicError = new Proxy(
      {},
      {
        getPrototypeOf() {
          throw new Error('prototype trap');
        },
        get() {
          throw new Error('message trap');
        },
      },
    );
    const toxicPayload = new Proxy(
      {},
      {
        get() {
          throw toxicError;
        },
        ownKeys() {
          throw toxicError;
        },
      },
    );
    const calls = [
      () => validateVizSpec(toxicPayload),
      () => validateSkillInvocation('nest.spike_raster', toxicPayload),
      () => validateSkillParams('nest.spike_raster', toxicPayload),
      () => validateSpec(toxicPayload),
      () => validateHostRendererInvocation('nest.correlogram', toxicPayload),
      () => validateHostRendererSpec(toxicPayload),
      () => routeToScene(toxicPayload),
      () => buildVizSpec(toxicPayload as never),
      () => buildHostRendererInvocation(toxicPayload as never),
    ];
    for (const call of calls) {
      expect(call).not.toThrow();
      expect(call().ok).toBe(false);
    }
  });
});

describe('render-ready means exact JSON', () => {
  it.each([
    ['BigInt', 1n],
    ['undefined', undefined],
    ['function', () => 1],
    ['class instance', new Date()],
  ])('rejects non-JSON %s params', (_label, value) => {
    const result = buildVizSpec({
      skill: 'nest.spike_raster',
      params: spikeParams({ extra: value }),
      source: 'run:1',
      declaredInputs: spikeInputs,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects circular params', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const result = buildVizSpec({
      skill: 'nest.spike_raster',
      params: spikeParams({ circular }),
      source: 'run:1',
      declaredInputs: spikeInputs,
    });
    expect(result.ok).toBe(false);
  });

  it.each([
    'non-enumerable fields',
    'accessors',
    'symbol keys',
    'toJSON hooks',
    'named array properties',
  ])('rejects descriptor-level JSON ambiguity: %s', (kind) => {
    const nested: Record<PropertyKey, unknown> = { x: 1 };
    if (kind === 'non-enumerable fields') {
      Object.defineProperty(nested, 'hidden', { value: 2, enumerable: false });
    } else if (kind === 'accessors') {
      Object.defineProperty(nested, 'dynamic', { get: () => 2, enumerable: true });
    } else if (kind === 'symbol keys') {
      nested[Symbol('hidden')] = 2;
    } else if (kind === 'toJSON hooks') {
      Object.defineProperty(nested, 'toJSON', {
        value: () => ({ x: 999 }),
        enumerable: false,
      });
    } else {
      const array = [1, 2] as number[] & { label?: string };
      array.label = 'silently dropped';
      nested.array = array;
    }
    const result = buildVizSpec({
      skill: 'nest.spike_raster',
      params: spikeParams({ nested }),
      source: 'run:1',
      declaredInputs: spikeInputs,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects values that are finite JavaScript but unstable or unbounded in JSON', () => {
    for (const value of [
      -0,
      'x'.repeat(CORTEXEL_JSON_LIMITS.maxStringLength + 1),
    ]) {
      expect(
        buildVizSpec({
          skill: 'nest.spike_raster',
          params: spikeParams({ value }),
          source: 'run:1',
          declaredInputs: spikeInputs,
        }).ok,
      ).toBe(false);
    }
  });

  it('rejects JSON features that change shape during schema parsing or stringify', () => {
    const protoKey = JSON.parse('{"__proto__":{"x":1},"a":1}') as Record<string, unknown>;
    expect(
      buildVizSpec({
        skill: 'nest.spike_raster',
        params: spikeParams({ nested: protoKey }),
        source: 'run:1',
        declaredInputs: spikeInputs,
      }).ok,
    ).toBe(false);

    const rawJson = (
      JSON as unknown as { rawJSON?: (source: string) => unknown }
    ).rawJSON;
    if (rawJson) {
      expect(
        buildVizSpec({
          skill: 'nest.spike_raster',
          params: spikeParams({ nested: rawJson('1') }),
          source: 'run:1',
          declaredInputs: spikeInputs,
        }).ok,
      ).toBe(false);
    }
  });

  it('round-trips every successful authored spec through JSON + validateSpec', () => {
    const result = buildVizSpec({
      skill: 'nest.spike_raster',
      params: spikeParams(),
      source: 'run:1',
      declaredInputs: spikeInputs,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const stored = JSON.parse(JSON.stringify(result.spec));
    expect(validateSpec(stored).ok).toBe(true);
  });

  it('never re-reads Proxy properties after exact-JSON inspection', () => {
    const changing = new Proxy(
      {},
      {
        ownKeys: () => ['x'],
        getOwnPropertyDescriptor(_target, key) {
          if (key === 'x') {
            return {
              configurable: true,
              enumerable: true,
              writable: true,
              value: 1,
            };
          }
          return undefined;
        },
        get(_target, key) {
          return key === 'x' ? 1n : undefined;
        },
        getPrototypeOf: () => Object.prototype,
      },
    );
    const result = validateVizSpec({
      scene: 'spike-raster',
      params: changing,
      provenance: { source: 'run:1' },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.params).toEqual({ x: 1 });
    expect(() => JSON.stringify(result.spec)).not.toThrow();
  });
});

describe('strict envelope and version contract', () => {
  it('rejects unknown envelope/provenance keys instead of silently stripping typos', () => {
    expect(
      validateVizSpec({
        scene: 'spike-raster',
        params: {},
        pallete: 'crameri',
        provenance: { source: 'x', synthethic: true },
      }).ok,
    ).toBe(false);
  });

  it('rejects unsupported versions with a specific repair error', () => {
    const result = validateSkillInvocation('nest.spike_raster', {
      scene: 'spike-raster',
      skill: 'nest.spike_raster',
      specVersion: '999.0.0',
      params: spikeParams(),
      provenance: { source: 'x', declared_inputs: spikeInputs },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0].code).toBe('unsupported_spec_version');
  });

  it('accepts the current version and rejects whitespace-only provenance', () => {
    expect(
      validateVizSpec({
        scene: 'spike-raster',
        specVersion: CORTEXEL_SPEC_VERSION,
        provenance: { source: 'x' },
      }).ok,
    ).toBe(true);
    expect(
      validateVizSpec({ scene: 'spike-raster', provenance: { source: '   ' } }).ok,
    ).toBe(false);
  });

  it('does not let runtime overrides replace source or declared inputs', () => {
    const result = buildVizSpec({
      skill: 'nest.spike_raster',
      params: spikeParams(),
      source: 'synthetic_test',
      declaredInputs: spikeInputs,
      provenance: { source: 'paper:spoof' } as never,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects typoed authoring fields instead of silently ignoring them', () => {
    expect(buildVizSpec({
      skill: 'nest.spike_raster',
      params: spikeParams(),
      source: 'run:1',
      declaredInputs: spikeInputs,
      pallete: 'crameri',
    } as never).ok).toBe(false);
    expect(buildHostRendererInvocation({
      skill: 'nest.correlogram',
      params: {
        lags_ms: [-1, 0, 1],
        correlation: [0, 1, 0],
        normalization: 'pearson_coefficient',
        correlation_units: '1',
      },
      source: 'run:1',
      declaredInputs: {
        bin_ms: 1,
        pair_labels: 'E×E',
        correlation_normalization: 'pearson_coefficient',
        correlation_units: '1',
      },
      renderRoute: 'd3',
    } as never).ok).toBe(false);
  });

  it('applies exact-JSON rules to the complete provenance envelope', () => {
    expect(validateVizSpec({
      scene: 'spike-raster',
      params: {},
      provenance: {
        source: 'run:1',
        declared_inputs: { device_id: -0 },
      },
    }).ok).toBe(false);
    const withProto = JSON.parse(
      '{"scene":"spike-raster","params":{},"provenance":{"source":"run:1","declared_inputs":{"__proto__":"evil"}}}',
    );
    expect(validateVizSpec(withProto).ok).toBe(false);
    for (const source of ['\ud800', '\udc00']) {
      expect(validateVizSpec({
        scene: 'spike-raster',
        params: {},
        provenance: { source },
      }).ok).toBe(false);
    }
    expect(validateVizSpec({
      scene: 'spike-raster',
      params: {},
      provenance: { source: '😀' },
    }).ok).toBe(true);
    expect(validateVizSpec({
      scene: 'spike-raster',
      params: {},
      provenance: { source: '\u0085' },
    }).ok).toBe(false);
    expect(validateVizSpec({
      scene: 'spike-raster',
      params: {},
      provenance: { source: '\ufeff' },
    }).ok).toBe(false);
  });
});

describe('scientific array and graph invariants', () => {
  it('fails fast before Zod amplifies one issue per hostile sample', () => {
    const result = validateSkillParams('nest.spike_raster', {
      times_ms: Array(PARAM_LIMITS.maxSamples).fill('not-a-number'),
      senders: Array(PARAM_LIMITS.maxSamples).fill(1),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].path).toBe('params.times_ms.0');
    }
  });

  it('rejects oversized direct and nested arrays before defensive cloning', () => {
    const oversized = new Array(100_001).fill(1);
    const spike = validateSkillParams('nest.spike_raster', {
      times_ms: oversized,
      senders: [1],
    });
    expect(spike.ok).toBe(false);
    if (!spike.ok) {
      expect(spike.errors).toHaveLength(1);
      expect(spike.errors[0].path).toBe('params.times_ms');
    }
    const trace = validateSkillParams('nest.voltage_trace', {
      times_ms: [0],
      series: [oversized],
      series_labels: ['V_m'],
      units: 'mV',
    });
    expect(trace.ok).toBe(false);
    if (!trace.ok) expect(trace.errors[0].path).toBe('params.series.0');
  });

  it('bounds strict unknown-key diagnostics by count and text size', () => {
    const payload: Record<string, unknown> = {
      scene: 'spike-raster',
      params: {},
      provenance: { source: 'run:1' },
    };
    for (let index = 0; index < 9_000; index++) payload[`unknown_${index}`] = true;
    const result = validateVizSpec(payload);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join('\n').length).toBeLessThan(8_500);
      expect(result.errors[0].length).toBeLessThan(800);
      expect(result.errors[0]).toContain('unrecognized keys (9000)');
    }
  });

  it('rejects huge unknown envelope, param, and provenance fields before cloning them', () => {
    const hugeSparse = new Array(5_000_000);
    const example = getExamplePayload('nest.spike_raster')!;
    const cases: Array<[Record<string, unknown>, string]> = [
      [{ ...example, unknown: hugeSparse }, 'invalid_envelope'],
      [{ ...example, params: { ...example.params, unknown: hugeSparse } }, 'invalid_params'],
      [{
        ...example,
        provenance: { ...example.provenance, unknown: hugeSparse },
      }, 'invalid_envelope'],
    ];
    for (const [payload, code] of cases) {
      const result = validateSkillInvocation('nest.spike_raster', payload);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe(code);
      }
    }
  });

  it('never invokes raw param accessors during the early size preflight', () => {
    let reads = 0;
    const params: Record<string, unknown> = { senders: [1] };
    Object.defineProperty(params, 'times_ms', {
      enumerable: true,
      get() {
        reads += 1;
        return [1];
      },
    });
    expect(validateSkillParams('nest.spike_raster', params).ok).toBe(false);
    expect(reads).toBe(0);
  });

  it('never invokes accessor discriminators before exact-envelope rejection', () => {
    for (const field of ['skill', 'specVersion', 'provenance'] as const) {
      let reads = 0;
      const payload = getExamplePayload('nest.spike_raster')! as Record<string, unknown>;
      Object.defineProperty(payload, field, {
        enumerable: true,
        configurable: true,
        get() {
          reads += 1;
          return field === 'skill'
            ? 'nest.spike_raster'
            : field === 'specVersion'
              ? CORTEXEL_SPEC_VERSION
              : { source: 'x' };
        },
      });
      expect(validateSkillInvocation('nest.spike_raster', payload).ok).toBe(false);
      expect(reads).toBe(0);
    }

    let hostReads = 0;
    const host = {
      skill: 'nest.correlogram',
      params: { lags_ms: [0], correlation: [1] },
      provenance: {
        source: 'x',
        declared_inputs: { bin_ms: 1, pair_labels: 'E×E' },
      },
    } as Record<string, unknown>;
    Object.defineProperty(host, 'skill', {
      enumerable: true,
      get() {
        hostReads += 1;
        return 'nest.correlogram';
      },
    });
    expect(validateHostRendererSpec(host).ok).toBe(false);
    expect(hostReads).toBe(0);
  });
  const cases: Array<[string, Record<string, unknown>]> = [
    ['nest.spike_raster', { times_ms: [1, 2], senders: [1] }],
    [
      'nest.voltage_trace',
      {
        times_ms: [0, 1],
        series: [[-65]],
        series_labels: ['neuron 1 · V_m'],
        units: 'mV',
      },
    ],
    [
      'nest.rate_response',
      { stimulus_amplitudes: [0, 1], rates_hz: [2], stimulus_units: 'pA' },
    ],
    ['nest.connectivity_matrix', { sources: [1, 2], targets: [2] }],
    [
      'nest.plasticity_dynamics',
      { times_ms: [0, 1], weights: [0.5], weight_units: 'nS' },
    ],
  ];

  it.each(cases)('%s rejects mismatched parallel axes', (skill, params) => {
    const example = getExamplePayload(skill)!;
    const result = validateSkillInvocation(skill, { ...example, params });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((e) => e.code === 'invalid_params')).toBe(true);
  });

  it('rejects negative ids and GPU-bound values outside Float32 range', () => {
    expect(
      validateSkillParams('nest.spike_raster', {
        times_ms: [1],
        senders: [-1],
      }).ok,
    ).toBe(false);
    expect(
      validateSkillParams('nest.spatial_3d', {
        objects: [{ x: 1e300, y: 0, z: 0 }],
      }).ok,
    ).toBe(false);
    // Time axes deliberately remain Float64 and retain long-run precision.
    expect(
      validateSkillParams('nest.spike_raster', {
        times_ms: [1e300],
        senders: [1],
      }).ok,
    ).toBe(true);
  });

  it('rejects typoed top-level params instead of silently preserving ignored data', () => {
    expect(
      validateSkillParams('nest.connectivity_matrix', {
        sources: [1],
        targets: [2],
        wieghts: [0.5],
      }).ok,
    ).toBe(false);
  });

  it('rejects record keys that normalization could collapse or overwrite', () => {
    expect(
      validateSkillParams('nest.phase_plane', {
        grid: { v: [0], ' v ': [1], w: [0] },
        derivatives: { v: [1], w: [1] },
      }).ok,
    ).toBe(false);
    expect(
      validateSkillParams('nest.animation_replay', {
        frames: [{ time_ms: 0, state: { a: 1, ' a ': 2 } }],
      }).ok,
    ).toBe(false);
    expect(
      validateVizSpec({
        scene: 'spike-raster',
        provenance: {
          source: 'x',
          declared_inputs: { units: 'mV', ' units ': 'pA' },
        },
      }).ok,
    ).toBe(false);
  });

  it('validates scene-less host-renderer params without inventing a Cortexel scene', () => {
    expect(
      validateSkillParams('nest.correlogram', {
        lags_ms: [-1, 0, 1],
        correlation: [0.1, 1, 0.1],
        normalization: 'pearson_coefficient',
        correlation_units: '1',
      }).ok,
    ).toBe(true);
    expect(
      validateSkillParams('nest.correlogram', {
        lags_ms: [-1, 0],
        correlation: [1],
        normalization: 'pearson_coefficient',
        correlation_units: '1',
      }).ok,
    ).toBe(false);
  });

  it.each([
    {
      nodes: [
        { id: 'a', kind: 'paper', label: 'A' },
        { id: 'a', kind: 'model', label: 'duplicate' },
      ],
      edges: [],
    },
    {
      nodes: [{ id: 'a', kind: 'paper', label: 'A' }],
      edges: [{ source: 'a', target: 'missing', kind: 'cites' }],
    },
    {
      nodes: [{ id: 'a', kind: 'paper', label: 'A' }],
      edges: [{ source: 'a', target: 'a', kind: 'cites' }],
    },
    {
      nodes: [
        { id: 'a', kind: 'paper', label: 'A' },
        { id: 'b', kind: 'paper', label: 'B' },
      ],
      edges: [
        { source: 'a', target: 'b', kind: 'cites' },
        { source: 'a', target: 'b', kind: 'cites' },
      ],
    },
    {
      nodes: [
        { id: 'a', kind: 'model', label: 'A' },
        { id: 'b', kind: 'model', label: 'B' },
      ],
      edges: [
        { source: 'a', target: 'b', kind: 'same_as' },
        { source: 'b', target: 'a', kind: 'same_as' },
      ],
    },
  ])('rejects graph identities that the scene cannot faithfully render', (params) => {
    const example = getExamplePayload('corpus.knowledge_graph')!;
    expect(
      validateSkillInvocation('corpus.knowledge_graph', { ...example, params }).ok,
    ).toBe(false);
  });
});
