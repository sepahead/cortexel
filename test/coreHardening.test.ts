import { describe, expect, it } from 'vitest';
import {
  buildVizSpec,
  buildHostRendererInvocation,
  CORTEXEL_JSON_LIMITS,
  CORTEXEL_SPEC_VERSION,
  PARAM_LIMITS,
  getHostRendererExamplePayload,
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

  it('never invokes hostile object conversion hooks while formatting diagnostics', () => {
    let toStringReads = 0;
    let toStringCalls = 0;
    let primitiveReads = 0;
    const hostileValue: Record<PropertyKey, unknown> = {};
    Object.defineProperty(hostileValue, 'toString', {
      get() {
        toStringReads += 1;
        return () => {
          toStringCalls += 1;
          return 'spoofed';
        };
      },
    });
    Object.defineProperty(hostileValue, Symbol.toPrimitive, {
      get() {
        primitiveReads += 1;
        return () => 'spoofed';
      },
    });

    const skillParams = validateSkillParams(hostileValue, {});
    const skillInvocation = validateSkillInvocation(hostileValue, {});
    const route = routeToScene({ deviceFamily: hostileValue });
    const host = getHostRendererExamplePayload('nest.spatial_2d')!;
    (host as Record<string, unknown>).specVersion = hostileValue;
    const hostInvocation = validateHostRendererInvocation('nest.spatial_2d', host);

    expect(skillParams).toMatchObject({
      ok: false,
      errors: [{ message: "unknown skill '<object>'" }],
    });
    expect(skillInvocation).toMatchObject({
      ok: false,
      errors: [{ message: "unknown skill '<object>'" }],
    });
    expect(route).toMatchObject({
      ok: false,
      message: "unknown device family '<object>'",
    });
    expect(hostInvocation).toMatchObject({
      ok: false,
      errors: [{ message: "unsupported spec version '<object>'" }],
    });
    expect({ toStringReads, toStringCalls, primitiveReads }).toEqual({
      toStringReads: 0,
      toStringCalls: 0,
      primitiveReads: 0,
    });
  });

  it('escapes bidi controls in diagnostics and rejects them in display identifiers', () => {
    const bidiOverride = '\u202e';
    const spoofed = `nest.${bidiOverride}spike_raster`;
    const unknown = validateSkillParams(spoofed, {});
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) {
      expect(unknown.errors[0].message).toContain('\\u202e');
      expect(unknown.errors[0].message).not.toContain(bidiOverride);
    }
    const routed = routeToScene({ deviceFamily: spoofed });
    expect(routed.ok).toBe(false);
    if (!routed.ok) {
      expect(routed.message).toContain('\\u202e');
      expect(routed.message).not.toContain(bidiOverride);
    }

    const spec = getExamplePayload('nest.spike_raster')!;
    spec.skill = spoofed;
    expect(validateVizSpec(spec).ok).toBe(false);

    const paletteSpec = getExamplePayload('nest.spike_raster')!;
    paletteSpec.palette = `crameri${bidiOverride}`;
    expect(validateVizSpec(paletteSpec).ok).toBe(false);

    const host = getHostRendererExamplePayload('nest.spatial_2d')!;
    host.skill = `nest.spatial_2d${bidiOverride}`;
    expect(validateHostRendererInvocation('nest.spatial_2d', host).ok).toBe(false);

    const hostileField = `evil${bidiOverride}\n${'x'.repeat(1_000)}`;
    const routedField = routeToScene({
      deviceFamily: 'multimeter',
      [hostileField]: true,
    });
    expect(routedField.ok).toBe(false);
    if (!routedField.ok) {
      expect(routedField.field).toContain('\\u202e\\u000a');
      expect(routedField.field).not.toMatch(/[\u0000-\u001f\u202e]/u);
      expect(routedField.field!.length).toBeLessThanOrEqual(240);
    }

    for (const authored of [
      buildVizSpec({
        skill: 'nest.spike_raster',
        params: spikeParams(),
        source: 'run:hostile-field',
        [hostileField]: true,
      } as never),
      buildHostRendererInvocation({
        skill: 'nest.spatial_2d',
        params: { positions: [[0, 0]], coordinate_units: 'mm' },
        source: 'run:hostile-field',
        [hostileField]: true,
      } as never),
    ]) {
      expect(authored.ok).toBe(false);
      if (!authored.ok) {
        const error = authored.errors[0];
        expect(error.path).toContain('\\u202e\\u000a');
        expect(error.message).toContain('\\u202e\\u000a');
        expect(`${error.path}${error.message}`).not.toMatch(/[\u0000-\u001f\u202e]/u);
        expect(error.path.length).toBeLessThanOrEqual(240);
        expect(error.message.length).toBeLessThanOrEqual(500);
      }
    }
  });

  it('never invokes a getter/conversion hook or re-throws while formatting a hostile thrown Proxy', () => {
    let messageGetterCalls = 0;
    let proxyGetCalls = 0;
    const toxicTarget = {};
    Object.defineProperty(toxicTarget, 'message', {
      configurable: true,
      get() {
        messageGetterCalls += 1;
        return 'hostile message getter';
      },
    });
    const toxicError = new Proxy(
      toxicTarget,
      {
        getPrototypeOf() {
          throw new Error('prototype trap');
        },
        get() {
          proxyGetCalls += 1;
          throw new Error('get trap');
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
      () => validateHostRendererInvocation('nest.spatial_2d', toxicPayload),
      () => validateHostRendererSpec(toxicPayload),
      () => routeToScene(toxicPayload),
      () => buildVizSpec(toxicPayload as never),
      () => buildHostRendererInvocation(toxicPayload as never),
    ];
    for (const call of calls) {
      expect(call).not.toThrow();
      expect(call().ok).toBe(false);
    }
    expect(routeToScene(toxicPayload)).toMatchObject({
      ok: false,
      message: expect.stringContaining('unknown error'),
    });
    expect({ messageGetterCalls, proxyGetCalls }).toEqual({
      messageGetterCalls: 0,
      proxyGetCalls: 0,
    });
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
      skill: 'nest.spatial_2d',
      params: {
        positions: [[0, 0]],
        coordinate_units: 'mm',
      },
      source: 'run:1',
      declaredInputs: {
        extent: '[1,1]',
        spatial_units: 'mm',
        mask: 'none',
        kernel: 'none',
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
    for (const [skill, params, path] of [
      [
        'nest.isi_distribution',
        { bin_centers_ms: oversized, values: [1] },
        'params.bin_centers_ms',
      ],
      [
        'nest.psth',
        { bin_centers_ms: [0], values: oversized },
        'params.values',
      ],
      [
        'nest.population_rate',
        { bin_centers_ms: [0], series: [{ spike_counts: oversized }] },
        'params.series.0.spike_counts',
      ],
      [
        'nest.correlogram',
        { lags_ms: oversized, values: [1] },
        'params.lags_ms',
      ],
      [
        'nest.weight_histogram',
        { bin_centers: oversized, values: [1] },
        'params.bin_centers',
      ],
    ] as const) {
      const result = validateSkillParams(skill, params);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors[0].path).toBe(path);
    }
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

  it('preflights nested graph attribute and evidence budgets before exact-JSON cloning', () => {
    const attributeArray = getExamplePayload('corpus.knowledge_graph')!;
    const attributeNode = (attributeArray.params.nodes as Array<Record<string, unknown>>)[0];
    attributeNode.attributes = { huge: new Array(5_000_000) };
    const attributeResult = validateSkillInvocation('corpus.knowledge_graph', attributeArray);
    expect(attributeResult.ok).toBe(false);
    if (!attributeResult.ok) {
      expect(attributeResult.errors).toHaveLength(1);
      expect(attributeResult.errors[0]).toMatchObject({
        code: 'invalid_params',
        path: 'params.nodes.0.attributes.huge',
      });
    }

    const evidenceArray = getExamplePayload('corpus.knowledge_graph')!;
    (evidenceArray.params.edges as Array<Record<string, unknown>>)[0].evidence =
      new Array(5_000_000);
    const evidenceResult = validateSkillInvocation('corpus.knowledge_graph', evidenceArray);
    expect(evidenceResult.ok).toBe(false);
    if (!evidenceResult.ok) {
      expect(evidenceResult.errors).toHaveLength(1);
      expect(evidenceResult.errors[0]).toMatchObject({
        code: 'invalid_params',
        path: 'params.edges.0.evidence',
      });
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
      skill: 'nest.spatial_2d',
      params: { positions: [[0, 0]], coordinate_units: 'mm' },
      provenance: {
        source: 'x',
        declared_inputs: {
          extent: '[1,1]', spatial_units: 'mm', mask: 'none', kernel: 'none',
        },
      },
    } as Record<string, unknown>;
    Object.defineProperty(host, 'skill', {
      enumerable: true,
      get() {
        hostReads += 1;
        return 'nest.spatial_2d';
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

  it('validates promoted correlogram params without weakening its strict shape', () => {
    expect(
      validateSkillParams('nest.correlogram', {
        lags_ms: [-1, 0, 1],
        values: [0.1, 1, 0.1],
        bin_width_ms: 1,
        tau_max_ms: 1,
        counting_start_ms: 0,
        counting_stop_ms: 100,
        pair: { reference_label: 'E', target_label: 'E' },
        lag_convention: 'positive_target_after_reference',
        binning: 'left_closed_right_open',
        zero_lag_policy: 'included',
        statistic: { kind: 'pearson_coefficient', units: '1', sample_count: 100 },
      }).ok,
    ).toBe(true);
    expect(
      validateSkillParams('nest.correlogram', {
        lags_ms: [-1, 0],
        values: [1],
        bin_width_ms: 1,
        tau_max_ms: 1,
        counting_start_ms: 0,
        counting_stop_ms: 100,
        pair: { reference_label: 'E', target_label: 'E' },
        lag_convention: 'positive_target_after_reference',
        binning: 'left_closed_right_open',
        zero_lag_policy: 'included',
        statistic: { kind: 'pearson_coefficient', units: '1', sample_count: 100 },
      }).ok,
    ).toBe(false);
  });

  it('rejects ambiguous graph identities and endpoints without collapsing parallel assertions', () => {
    const mutations: Array<(params: Record<string, unknown>) => void> = [
      (params) => {
        const nodes = params.nodes as Array<Record<string, unknown>>;
        nodes[1].id = nodes[0].id;
      },
      (params) => {
        (params.edges as Array<Record<string, unknown>>)[0].target = 'missing';
      },
      (params) => {
        const edge = (params.edges as Array<Record<string, unknown>>)[0];
        edge.target = edge.source;
      },
      (params) => {
        const edges = params.edges as Array<Record<string, unknown>>;
        edges[1].id = edges[0].id;
      },
    ];
    for (const mutate of mutations) {
      const example = getExamplePayload('corpus.knowledge_graph')!;
      mutate(example.params as Record<string, unknown>);
      expect(validateSkillInvocation('corpus.knowledge_graph', example).ok).toBe(false);
    }

    const parallel = getExamplePayload('corpus.knowledge_graph')!;
    const edges = parallel.params.edges as Array<Record<string, unknown>>;
    edges.push({
      ...structuredClone(edges[1]),
      id: 'independent-variant-assertion',
      evidence: [{
        kind: 'graph_snapshot_record',
        evidence_id: 'independent-variant-evidence',
        record_id: 'independent-variant-assertion',
      }],
    });
    expect(validateSkillInvocation('corpus.knowledge_graph', parallel).ok).toBe(true);
  });
});
