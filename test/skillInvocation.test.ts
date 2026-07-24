import { describe, it, expect } from 'vitest';
import { validateSkillInvocation } from '../core/skills/validateSkillInvocation';
import { getExamplePayload } from '../core/skills/examples';
import { provenanceParamConstraintError } from '../core/skills/provenanceKeys';
import { canonicalDigest } from '../src/core/canonicalize';

const goodProv = {
  source: 'nest_simulation:run42',
  declared_inputs: {
    recorder_id: 'sr_1',
    sender_ids: '[1,2,3]',
    population_labels: 'E,I',
    time_units: 'ms',
  },
};

function spikeSpec(overrides: Record<string, unknown> = {}) {
  return {
    scene: 'spike-raster',
    params: { times_ms: [1, 2, 3], senders: [1, 2, 3] },
    provenance: goodProv,
    ...overrides,
  };
}

describe('validateSkillInvocation', () => {
  it('resolves only safe own-property paths for nested provenance bindings', () => {
    const constraint = {
      kind: 'equals_param_path' as const,
      provenanceKey: 'reference_population' as const,
      paramPath: 'pair.reference_label',
      description: 'test binding',
    };
    expect(provenanceParamConstraintError(
      constraint,
      { pair: { reference_label: 'E' } },
      { reference_population: 'E' },
    )).toBeNull();
    expect(provenanceParamConstraintError(
      constraint,
      { pair: { reference_label: 'E' } },
      { reference_population: 'I' },
    )).toContain('params.pair.reference_label');
    expect(provenanceParamConstraintError(
      { ...constraint, paramPath: '__proto__.spoof' },
      {},
      { reference_population: 'E' },
    )).toContain('not a safe parameter path');
  });

  it('accepts a well-formed spike_raster invocation and returns a caption', () => {
    const r = validateSkillInvocation('nest.spike_raster', spikeSpec());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.scene).toBe('spike-raster');
      // advisory/non-paper-local defaults → caption required (fail-closed).
      expect(r.caption).toBeTruthy();
    }
  });

  it('rejects an unknown skill id (fail-closed)', () => {
    const r = validateSkillInvocation('nest.nope', spikeSpec());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].code).toBe('unknown_skill');
  });

  it('rejects missing required params', () => {
    const r = validateSkillInvocation(
      'nest.spike_raster',
      spikeSpec({ params: { times_ms: [1, 2, 3] } }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.code === 'invalid_params')).toBe(true);
  });

  it('rejects missing required provenance keys', () => {
    const r = validateSkillInvocation(
      'nest.spike_raster',
      spikeSpec({
        provenance: { source: 'nest_simulation:run42', declared_inputs: { recorder_id: 'sr_1' } },
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const missing = r.errors.filter((e) => e.code === 'missing_provenance');
      expect(missing.length).toBeGreaterThan(0);
    }
  });

  it('rejects meaningless required provenance values, not just missing keys', () => {
    const voltage = validateSkillInvocation('nest.voltage_trace', {
      scene: 'voltage-trace',
      params: {
        times_ms: [0, 1],
        series: [[-65, -64]],
        series_labels: ['neuron 1 · V_m'],
        units: 'mV',
      },
      provenance: {
        source: 'run:1',
        declared_inputs: {
          device_id: 'mm_1',
          recorded_variable: 'V_m',
          units: true,
          sampling_interval: -1,
        },
      },
    });
    expect(voltage.ok).toBe(false);
    if (!voltage.ok) {
      expect(voltage.errors.filter((e) => e.code === 'invalid_provenance')).toHaveLength(2);
    }

    const graph = getExamplePayload('corpus.knowledge_graph')!;
    graph.provenance.declared_inputs!.identity_advisory = 'false';
    const graphResult = validateSkillInvocation('corpus.knowledge_graph', graph);
    expect(graphResult.ok).toBe(false);
    if (!graphResult.ok) {
      expect(graphResult.errors.some((e) => e.code === 'invalid_provenance')).toBe(true);
    }
  });

  it('normalizes and cross-checks every declared provenance value against params', () => {
    const voltage = validateSkillInvocation('nest.voltage_trace', {
      scene: 'voltage-trace',
      params: {
        times_ms: [0, 1],
        series: [[-65, -64]],
        series_labels: ['neuron 1 · V_m'],
        units: 'mV',
      },
      provenance: {
        source: 'run:1',
        declared_inputs: {
          device_id: ' mm_1 ',
          recorded_variable: ' V_m ',
          units: ' mV ',
          sampling_interval: 1,
        },
      },
    });
    expect(voltage.ok).toBe(true);
    if (voltage.ok) {
      expect(voltage.spec.provenance.declared_inputs).toMatchObject({
        device_id: 'mm_1',
        recorded_variable: 'V_m',
        units: 'mV',
      });
    }

    const mismatch = structuredClone(getExamplePayload('nest.voltage_trace')!);
    mismatch.provenance.declared_inputs!.units = 'pA';
    expect(validateSkillInvocation('nest.voltage_trace', mismatch).ok).toBe(false);

    for (const [key, value] of [
      ['sampling_interval', -1],
      ['synapse_model', 'static_synapse'],
    ] as const) {
      const extraKnown = spikeSpec({
        provenance: {
          ...goodProv,
          declared_inputs: {
            ...goodProv.declared_inputs,
            [key]: value,
          },
        },
      });
      expect(
        validateSkillInvocation('nest.spike_raster', extraKnown).ok,
        key,
      ).toBe(false);
    }
  });

  it('rejects every reproduced params↔provenance contradiction at the strict boundary', () => {
    const cases: Array<{
      skill:
        | 'nest.voltage_trace'
        | 'nest.spike_raster'
        | 'nest.population_rate'
        | 'nest.connectivity_matrix'
        | 'nest.connection_graph'
        | 'nest.adjacency_matrix'
        | 'nest.weight_matrix'
        | 'nest.delay_matrix'
        | 'nest.in_degree_distribution'
        | 'nest.out_degree_distribution'
        | 'nest.weight_histogram'
        | 'nest.spatial_map_2d'
        | 'nest.phase_plane';
      mutate: (payload: ReturnType<typeof getExamplePayload> & object) => void;
      label: string;
    }> = [
      {
        skill: 'nest.voltage_trace',
        label: 'sampling interval',
        mutate: (payload) => {
          payload.provenance.declared_inputs!.sampling_interval = 0.1;
        },
      },
      {
        skill: 'nest.voltage_trace',
        label: 'irregular timestamp axis',
        mutate: (payload) => {
          payload.params.times_ms = [0, 1, 3];
        },
      },
      {
        skill: 'nest.voltage_trace',
        label: 'recorded variable label',
        mutate: (payload) => {
          payload.params.series_labels = ['I_syn'];
        },
      },
      {
        skill: 'nest.voltage_trace',
        label: 'quantity/unit dimension',
        mutate: (payload) => {
          payload.params.units = 'pA';
          payload.provenance.declared_inputs!.units = 'pA';
        },
      },
      {
        skill: 'nest.spike_raster',
        label: 'observed sender outside universe',
        mutate: (payload) => {
          payload.provenance.declared_inputs!.sender_ids = '[999]';
        },
      },
      {
        skill: 'nest.population_rate',
        label: 'population sender denominator',
        mutate: (payload) => {
          payload.provenance.declared_inputs!.sender_ids = '[1]';
        },
      },
      {
        skill: 'nest.population_rate',
        label: 'population series identity',
        mutate: (payload) => {
          payload.provenance.declared_inputs!.population_labels = '["I"]';
        },
      },
      {
        skill: 'nest.connectivity_matrix',
        label: 'legacy endpoints outside universes',
        mutate: (payload) => {
          payload.provenance.declared_inputs!.source_ids = '[999]';
          payload.provenance.declared_inputs!.target_ids = '[998]';
        },
      },
      {
        skill: 'nest.connection_graph',
        label: 'graph source outside universe',
        mutate: (payload) => {
          payload.provenance.declared_inputs!.source_ids = '[999]';
        },
      },
      {
        skill: 'nest.connection_graph',
        label: 'edge-level synapse model',
        mutate: (payload) => {
          payload.provenance.declared_inputs!.synapse_model = 'stdp_synapse';
        },
      },
      ...(['nest.adjacency_matrix', 'nest.weight_matrix', 'nest.delay_matrix'] as const).map(
        (skill) => ({
          skill,
          label: `${skill} ordered axes`,
          mutate: (payload: ReturnType<typeof getExamplePayload> & object) => {
            payload.provenance.declared_inputs!.source_ids = '[999]';
            payload.provenance.declared_inputs!.target_ids = '[998]';
          },
        }),
      ),
      {
        skill: 'nest.in_degree_distribution',
        label: 'in-degree target-universe cardinality',
        mutate: (payload) => {
          payload.provenance.declared_inputs!.target_ids = '[3]';
        },
      },
      {
        skill: 'nest.out_degree_distribution',
        label: 'out-degree source-universe cardinality',
        mutate: (payload) => {
          payload.provenance.declared_inputs!.source_ids = '[1]';
        },
      },
      {
        skill: 'nest.weight_histogram',
        label: 'weight snapshot time',
        mutate: (payload) => {
          payload.provenance.declared_inputs!.snapshot_time_ms = 0;
        },
      },
      {
        skill: 'nest.spatial_map_2d',
        label: 'spatial node ids',
        mutate: (payload) => {
          payload.provenance.declared_inputs!.node_ids = '[999]';
        },
      },
      {
        skill: 'nest.spatial_map_2d',
        label: 'spatial extent',
        mutate: (payload) => {
          payload.provenance.declared_inputs!.extent = '[999,999]';
        },
      },
      {
        skill: 'nest.phase_plane',
        label: 'phase-plane state variables',
        mutate: (payload) => {
          payload.provenance.declared_inputs!.state_variables = '["Ca","IP3"]';
        },
      },
    ];

    for (const { skill, mutate, label } of cases) {
      const payload = structuredClone(getExamplePayload(skill)!);
      mutate(payload);
      const result = validateSkillInvocation(skill, payload);
      expect(result.ok, label).toBe(false);
      if (!result.ok) {
        expect(
          result.errors.some((error) => error.code === 'invalid_provenance'),
          label,
        ).toBe(true);
      }
    }
  });

  it('accepts exact voltage identity grammar and bounded binary64 time roundoff', () => {
    const payload = structuredClone(getExamplePayload('nest.voltage_trace')!);
    payload.params.times_ms = [1_000_000, 1_000_000.1, 1_000_000.2];
    payload.params.series = [[-65, -64, -63]];
    payload.params.series_labels = ['neuron 1 · V_m'];
    payload.provenance.declared_inputs!.sampling_interval = 0.1;
    expect(validateSkillInvocation('nest.voltage_trace', payload).ok).toBe(true);

    for (const invalidLabels of [
      ['v_m'],
      ['neuron 1 · V_m · extra'],
      [' · V_m'],
      ['neuron 1 - V_m'],
    ]) {
      const invalid = structuredClone(getExamplePayload('nest.voltage_trace')!);
      invalid.params.series_labels = invalidLabels;
      expect(
        validateSkillInvocation('nest.voltage_trace', invalid).ok,
        invalidLabels[0],
      ).toBe(false);
    }
  });

  it('requires enough strictly ordered samples to substantiate sampling claims', () => {
    for (const times of [[0], [0, 0, 1], [0, 2, 1]]) {
      const payload = structuredClone(getExamplePayload('nest.voltage_trace')!);
      payload.params.times_ms = times;
      payload.params.series = [times.map(() => -65)];
      expect(
        validateSkillInvocation('nest.voltage_trace', payload).ok,
        JSON.stringify(times),
      ).toBe(false);
    }
  });

  it('keeps the legacy astrocyte contract Ca-only and concentration-dimensional', () => {
    for (const mutate of [
      (payload: NonNullable<ReturnType<typeof getExamplePayload>>) => {
        payload.provenance.declared_inputs!.recorded_variable = 'V_m';
      },
      (payload: NonNullable<ReturnType<typeof getExamplePayload>>) => {
        payload.params.units = 'mV';
        payload.provenance.declared_inputs!.units = 'mV';
      },
      (payload: NonNullable<ReturnType<typeof getExamplePayload>>) => {
        payload.params.times_ms = [0, 2, 3];
      },
    ]) {
      const payload = structuredClone(getExamplePayload('nest.astrocyte_dynamics')!);
      mutate(payload);
      expect(validateSkillInvocation('nest.astrocyte_dynamics', payload).ok).toBe(false);
    }
    for (const [recordedVariable, units] of [
      ['Ca', 'uM'],
      ['Ca_astro', 'µM'],
      ['Ca_astro', 'μM'],
    ] as const) {
      const payload = structuredClone(getExamplePayload('nest.astrocyte_dynamics')!);
      payload.params.units = units;
      payload.provenance.declared_inputs!.units = units;
      payload.provenance.declared_inputs!.recorded_variable = recordedVariable;
      const result = validateSkillInvocation('nest.astrocyte_dynamics', payload);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.caption).toContain('Caller-declared provenance');
        expect(result.caption).toContain('recorded variable');
        expect(result.caption).toMatch(
          /^Derived view — .* Caller-declared provenance — .* Schematic —/,
        );
      }
    }
  });

  it('supports scalable canonical digests without pretending they prove membership', () => {
    const matrix = structuredClone(getExamplePayload('nest.weight_matrix')!);
    matrix.provenance.declared_inputs!.source_ids = canonicalDigest(
      matrix.params.source_ids,
    );
    matrix.provenance.declared_inputs!.target_ids = canonicalDigest(
      matrix.params.target_ids,
    );
    expect(validateSkillInvocation('nest.weight_matrix', matrix).ok).toBe(true);

    const spatial = structuredClone(getExamplePayload('nest.spatial_map_2d')!);
    spatial.provenance.declared_inputs!.node_ids = canonicalDigest([41, 99]);
    expect(validateSkillInvocation('nest.spatial_map_2d', spatial).ok).toBe(true);

    const nonLexicalNumericOrder = structuredClone(
      getExamplePayload('nest.spatial_map_2d')!,
    );
    nonLexicalNumericOrder.params.nodes = [
      { id: 2, label: '2', x: -0.5, y: 0 },
      { id: 10, label: '10', x: 0.5, y: 0 },
    ];
    nonLexicalNumericOrder.provenance.declared_inputs!.node_ids =
      canonicalDigest([2, 10]);
    expect(
      validateSkillInvocation(
        'nest.spatial_map_2d',
        nonLexicalNumericOrder,
      ).ok,
    ).toBe(true);
    nonLexicalNumericOrder.provenance.declared_inputs!.node_ids =
      canonicalDigest([10, 2]);
    expect(
      validateSkillInvocation(
        'nest.spatial_map_2d',
        nonLexicalNumericOrder,
      ).ok,
    ).toBe(false);

    const spike = structuredClone(getExamplePayload('nest.spike_raster')!);
    spike.provenance.declared_inputs!.sender_ids =
      `sha256:${'0'.repeat(64)};count:2`;
    const result = validateSkillInvocation('nest.spike_raster', spike);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.caption).toContain('Caller-declared provenance');
      expect(result.caption).toContain('sender ids');
    }

    for (const senderIds of [
      `sha256:${'0'.repeat(64)};count:0`,
      '[1,1]',
      '[true,false]',
      '[null,1]',
      '["alice","bob"]',
    ]) {
      const contradicted = structuredClone(getExamplePayload('nest.spike_raster')!);
      contradicted.provenance.declared_inputs!.sender_ids = senderIds;
      expect(
        validateSkillInvocation('nest.spike_raster', contradicted).ok,
        senderIds,
      ).toBe(false);
    }

    for (const [skill, key, value] of [
      ['nest.population_rate', 'sender_ids', '[1,1]'],
      ['nest.in_degree_distribution', 'target_ids', '[3,3]'],
      ['nest.in_degree_distribution', 'target_ids', '[null,true]'],
      ['nest.out_degree_distribution', 'source_ids', '[1,1,1]'],
    ] as const) {
      const contradicted = structuredClone(getExamplePayload(skill)!);
      contradicted.provenance.declared_inputs![key] = value;
      expect(validateSkillInvocation(skill, contradicted).ok, `${skill}:${value}`).toBe(false);
    }

    const disjointPopulations = structuredClone(
      getExamplePayload('nest.population_rate')!,
    );
    const populationSeries = disjointPopulations.params.series as Array<
      Record<string, unknown>
    >;
    populationSeries.push({
      id: 'I',
      label: 'Inhibitory population',
      recorded_sender_count: 2,
      spike_counts: [0, 1, 2],
      rates_hz: [0, 100, 200],
    });
    disjointPopulations.provenance.declared_inputs!.population_labels =
      '["E","I"]';
    disjointPopulations.provenance.declared_inputs!.sender_ids = '[1,2]';
    expect(
      validateSkillInvocation('nest.population_rate', disjointPopulations).ok,
      'global sender universe must cover the sum of disjoint population denominators',
    ).toBe(false);
  });

  it('requires a nonempty opposite endpoint universe for positive aggregate connection counts', () => {
    const cases = [
      ['nest.in_degree_distribution', 'source_ids'],
      ['nest.out_degree_distribution', 'target_ids'],
      ['nest.delay_distribution', 'source_ids'],
      ['nest.delay_distribution', 'target_ids'],
      ['nest.weight_histogram', 'source_ids'],
      ['nest.weight_histogram', 'target_ids'],
    ] as const;

    for (const [skill, key] of cases) {
      for (const emptyDeclaration of [
        '[]',
        `sha256:${'0'.repeat(64)};count:0`,
      ]) {
        const contradicted = structuredClone(getExamplePayload(skill)!);
        contradicted.provenance.declared_inputs![key] = emptyDeclaration;
        expect(
          validateSkillInvocation(skill, contradicted).ok,
          `${skill}:${key}:${emptyDeclaration}`,
        ).toBe(false);
      }

      for (const nonemptyDeclaration of [
        '[999]',
        `sha256:${'0'.repeat(64)};count:1`,
      ]) {
        const admissibleExternalClaim = structuredClone(
          getExamplePayload(skill)!,
        );
        admissibleExternalClaim.provenance.declared_inputs![key] =
          nonemptyDeclaration;
        expect(
          validateSkillInvocation(skill, admissibleExternalClaim).ok,
          `${skill}:${key}:${nonemptyDeclaration}`,
        ).toBe(true);
      }
    }
  });

  it('permits empty opposite endpoint universes only when aggregate connection_count is zero', () => {
    const inDegree = structuredClone(
      getExamplePayload('nest.in_degree_distribution')!,
    );
    inDegree.params.node_counts = [2, 0, 0];
    inDegree.params.values = [2, 0, 0];
    inDegree.params.connection_count = 0;
    inDegree.provenance.declared_inputs!.source_ids = '[]';
    expect(
      validateSkillInvocation('nest.in_degree_distribution', inDegree).ok,
    ).toBe(true);

    const outDegree = structuredClone(
      getExamplePayload('nest.out_degree_distribution')!,
    );
    outDegree.params.node_counts = [3, 0];
    outDegree.params.values = [3, 0];
    outDegree.params.connection_count = 0;
    outDegree.provenance.declared_inputs!.target_ids =
      `sha256:${'0'.repeat(64)};count:0`;
    expect(
      validateSkillInvocation('nest.out_degree_distribution', outDegree).ok,
    ).toBe(true);

    const delay = structuredClone(
      getExamplePayload('nest.delay_distribution')!,
    );
    delay.params.delay_counts = [0, 0, 0];
    delay.params.values = [0, 0, 0];
    delay.params.connection_count = 0;
    delay.provenance.declared_inputs!.source_ids = '[]';
    delay.provenance.declared_inputs!.target_ids =
      `sha256:${'0'.repeat(64)};count:0`;
    expect(
      validateSkillInvocation('nest.delay_distribution', delay).ok,
    ).toBe(true);

    const weight = structuredClone(
      getExamplePayload('nest.weight_histogram')!,
    );
    weight.params.weight_counts = [0, 0, 0, 0, 0];
    weight.params.values = [0, 0, 0, 0, 0];
    weight.params.connection_count = 0;
    weight.provenance.declared_inputs!.source_ids =
      `sha256:${'0'.repeat(64)};count:0`;
    weight.provenance.declared_inputs!.target_ids = '[]';
    expect(
      validateSkillInvocation('nest.weight_histogram', weight).ok,
    ).toBe(true);
  });

  it('requires every external id-universe declaration to have a canonical typed form', () => {
    const malformed = [
      'abc',
      '[1,1]',
      '["1"]',
      '[-1]',
      '[1.5]',
      '[1, 2]',
      `sha256:${'A'.repeat(64)}`,
      `sha256:${'0'.repeat(64)};count:01`,
    ];
    for (const skill of ['nest.isi_distribution', 'nest.psth'] as const) {
      for (const senderIds of malformed) {
        const contradicted = structuredClone(getExamplePayload(skill)!);
        contradicted.provenance.declared_inputs!.sender_ids = senderIds;
        expect(
          validateSkillInvocation(skill, contradicted).ok,
          `${skill}:${senderIds}`,
        ).toBe(false);
      }

      for (const senderIds of [
        '[]',
        '[0,9007199254740991]',
        `sha256:${'0'.repeat(64)}`,
        `sha256:${'0'.repeat(64)};count:0`,
      ]) {
        const structurallyTyped = structuredClone(getExamplePayload(skill)!);
        structurallyTyped.provenance.declared_inputs!.sender_ids = senderIds;
        expect(
          validateSkillInvocation(skill, structurallyTyped).ok,
          `${skill}:${senderIds}`,
        ).toBe(true);
      }
    }
  });

  it('requires a canonical positive three-axis extent for the legacy 3D scene', () => {
    for (const extent of [
      'abc',
      '[]',
      '[1,2]',
      '[1,2,3,4]',
      '[1, 2, 3]',
      '[1,2,0]',
      '[1,2,-1]',
      '[1,2,null]',
      '[1,2,"3"]',
    ]) {
      const contradicted = structuredClone(
        getExamplePayload('nest.spatial_3d')!,
      );
      contradicted.provenance.declared_inputs!.extent = extent;
      expect(
        validateSkillInvocation('nest.spatial_3d', contradicted).ok,
        extent,
      ).toBe(false);
    }

    const valid = structuredClone(getExamplePayload('nest.spatial_3d')!);
    valid.provenance.declared_inputs!.extent = '[0.5,2,3]';
    expect(validateSkillInvocation('nest.spatial_3d', valid).ok).toBe(true);
  });

  it('binds histogram provenance to binning, normalization, scope/alignment, and units', () => {
    const cases: Array<[
      'nest.isi_distribution' | 'nest.psth' | 'nest.weight_histogram',
      string,
      string | number,
    ]> = [
      ['nest.isi_distribution', 'bin_ms', 2],
      ['nest.isi_distribution', 'histogram_normalization', 'probability'],
      ['nest.isi_distribution', 'interval_scope', 'single_train'],
      ['nest.psth', 'event_alignment', 'response onset'],
      ['nest.psth', 'psth_aggregation', 'mean_per_sender'],
      ['nest.weight_histogram', 'weight_units', 'nS'],
      ['nest.weight_histogram', 'histogram_normalization', 'probability'],
      ['nest.weight_histogram', 'connection_sample_policy', 'sampled'],
      ['nest.weight_histogram', 'snapshot_scope', 'mpi_all_ranks_merged'],
      ['nest.weight_histogram', 'parallel_edge_policy', 'collapse_parallel_edges'],
    ];
    for (const [skill, key, value] of cases) {
      const example = structuredClone(getExamplePayload(skill)!);
      example.provenance.declared_inputs![key] = value;
      const result = validateSkillInvocation(skill, example);
      expect(result.ok, `${skill}:${key}`).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContainEqual(
          expect.objectContaining({ code: 'invalid_provenance' }),
        );
      }
    }
  });

  it('binds population-rate and nested correlogram semantics into provenance', () => {
    const cases: Array<[
      'nest.population_rate' | 'nest.correlogram',
      string,
      string | number,
    ]> = [
      ['nest.population_rate', 'bin_ms', 10],
      ['nest.population_rate', 'rate_normalization', 'aggregate_rate_hz'],
      ['nest.population_rate', 'binning_policy', 'right_closed'],
      ['nest.correlogram', 'reference_population', 'different reference'],
      ['nest.correlogram', 'target_population', 'different target'],
      ['nest.correlogram', 'bin_ms', 2],
      ['nest.correlogram', 'correlation_normalization', 'pearson_coefficient'],
      ['nest.correlogram', 'correlation_units', 'Hz'],
      ['nest.correlogram', 'lag_convention', 'positive_reference_after_target'],
      ['nest.correlogram', 'binning_policy', 'closed'],
    ];
    for (const [skill, key, value] of cases) {
      const example = getExamplePayload(skill)!;
      example.provenance.declared_inputs![key] = value;
      const result = validateSkillInvocation(skill, example);
      expect(result.ok, `${skill}:${key}`).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContainEqual(expect.objectContaining({
          code: 'invalid_provenance',
          path: `provenance.declared_inputs.${key}`,
        }));
      }
    }
  });

  it('binds corpus graph source, immutable snapshot, and scope into provenance', () => {
    for (const [key, value] of [
      ['graph_source', 'different-source'],
      ['graph_snapshot_id', 'different-snapshot'],
      ['graph_scope', 'paper_evidence'],
    ] as const) {
      const example = getExamplePayload('corpus.knowledge_graph')!;
      example.provenance.declared_inputs![key] = value;
      const result = validateSkillInvocation('corpus.knowledge_graph', example);
      expect(result.ok, key).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            code: 'invalid_provenance',
            path: `provenance.declared_inputs.${key}`,
          }),
        );
      }
    }
  });

  it('rejects corpus provenance flags that contradict derived/advisory elements', () => {
    for (const [flag, value] of [
      ['advisory_only', false],
      ['is_paper_local_evidence', true],
    ] as const) {
      const example = getExamplePayload('corpus.knowledge_graph')!;
      example.provenance[flag] = value;
      const result = validateSkillInvocation('corpus.knowledge_graph', example);
      expect(result.ok, flag).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContainEqual(expect.objectContaining({
          code: 'invalid_provenance',
          path: `provenance.${flag}`,
        }));
      }
    }
  });

  it('rejects a corpus graph whose evidence is entirely self/internal references', () => {
    const example = getExamplePayload('corpus.knowledge_graph')!;
    for (const node of example.params.nodes as Array<Record<string, unknown>>) {
      node.evidence = [{
        kind: 'graph_node',
        evidence_id: `internal-node:${node.id}`,
        node_id: node.id,
      }];
    }
    for (const edge of example.params.edges as Array<Record<string, unknown>>) {
      edge.evidence = [{
        kind: 'graph_node',
        evidence_id: `internal-edge:${edge.id}`,
        node_id: edge.source,
      }];
    }
    const result = validateSkillInvocation('corpus.knowledge_graph', example);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'invalid_params',
        path: 'params.nodes.0.evidence',
      }));
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'invalid_params',
        path: 'params.edges.0.evidence',
      }));
    }
  });

  it('requires an RFC3339 corpus graph generation timestamp', () => {
    const example = getExamplePayload('corpus.knowledge_graph')!;
    example.params.generated_at = '2026-07-11T12:00:00';
    const result = validateSkillInvocation('corpus.knowledge_graph', example);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        code: 'invalid_params',
        path: 'params.generated_at',
      }));
    }
  });

  it('rejects unknown claim-like provenance keys', () => {
    const result = validateSkillInvocation(
      'nest.spike_raster',
      spikeSpec({
        provenance: {
          ...goodProv,
          declared_inputs: {
            ...goodProv.declared_inputs,
            certified_measured: true,
          },
        },
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'invalid_provenance' }),
      );
    }
  });

  it('rejects obsolete unbound provenance claims', () => {
    for (const key of ['node_kinds', 'edge_kinds', 'pair_labels']) {
      const example = getExamplePayload('corpus.knowledge_graph')!;
      example.provenance.declared_inputs![key] = 'obsolete';
      const result = validateSkillInvocation('corpus.knowledge_graph', example);
      expect(result.ok, key).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContainEqual(expect.objectContaining({
          code: 'invalid_provenance',
          path: `provenance.declared_inputs.${key}`,
        }));
      }
    }
  });

  it('requires an explicit phase-plane flattening convention', () => {
    const example = getExamplePayload('nest.phase_plane')!;
    expect(validateSkillInvocation('nest.phase_plane', example).ok).toBe(true);
    const ambiguous = structuredClone(example);
    delete (ambiguous.params as Record<string, unknown>).axis_order;
    expect(validateSkillInvocation('nest.phase_plane', ambiguous).ok).toBe(false);
  });

  it('enforces semantic endpoint kinds in knowledge graphs', () => {
    const graph = getExamplePayload('corpus.knowledge_graph')!;
    const edge = (graph.params.edges as Array<Record<string, unknown>>)[0];
    edge.source = 'm1';
    edge.target = 'f1';
    edge.kind = 'cites';
    const result = validateSkillInvocation('corpus.knowledge_graph', graph);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => /paper → paper/.test(error.message))).toBe(true);
    }
  });

  it('rejects calibrated_posterior=true as unsupported (mirrors the 501 boundary)', () => {
    const r = validateSkillInvocation(
      'nest.spike_raster',
      spikeSpec({ provenance: { ...goodProv, calibrated_posterior: true } }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(
        r.errors.some((e) => e.code === 'calibrated_posterior_unsupported'),
      ).toBe(true);
    }
  });

  it('forces a schematic caption when synthetic=true', () => {
    const r = validateSkillInvocation(
      'nest.spike_raster',
      spikeSpec({ provenance: { ...goodProv, synthetic: true } }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.caption).toMatch(/[Ss]chematic|illustrative/);
  });

  it('refuses a skill with no Cortexel scene (honest gap)', () => {
    const r = validateSkillInvocation('nest.compartmental_dynamics', {
      scene: 'voltage-trace',
      params: { compartments: [] },
      provenance: goodProv,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.code === 'no_cortexel_scene')).toBe(true);
  });

  it('always carries a derived-view disclosure for a weak skill (astrocyte)', () => {
    const r = validateSkillInvocation('nest.astrocyte_dynamics', {
      scene: 'voltage-trace',
      params: { times_ms: [0, 1], ca_trace: [0.1, 0.2], units: 'uM' },
      provenance: {
        source: 'nest_simulation:astro',
        declared_inputs: {
          recorded_variable: 'Ca',
          units: 'uM',
          time_units: 'ms',
          sampling_interval: 1,
        },
      },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.caption).toMatch(/Derived view/);
      // The astrocyte disclosure names the real reason (Ca/IP3 ≠ voltage).
      expect(r.caption).toMatch(/not membrane voltage/);
    }
  });

  it("knowledge-graph weak disclosure states the ADVISORY-IDENTITY reason, not a false 'scene reuse' claim", () => {
    const r = validateSkillInvocation(
      'corpus.knowledge_graph',
      getExamplePayload('corpus.knowledge_graph')!,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Must NOT claim it reuses/approximates some other scene (knowledge-graph-3d
      // is its native scene) — the old hard-coded template stated this falsehood.
      expect(r.caption).not.toMatch(/reuses the .* scene/);
      expect(r.caption).not.toMatch(/not a 1:1 rendering/);
      expect(r.caption).toMatch(/structural similarity, not certified sameness/);
    }
  });

  it('a weak disclosure is PREPENDED to an agent-supplied provenance caption', () => {
    const r = validateSkillInvocation('nest.astrocyte_dynamics', {
      scene: 'voltage-trace',
      params: { times_ms: [0, 1], ca_trace: [0.1, 0.2], units: 'uM' },
      provenance: {
        source: 'nest_simulation:astro',
        caption: 'Panel A',
        declared_inputs: {
          recorded_variable: 'Ca',
          units: 'uM',
          time_units: 'ms',
          sampling_interval: 1,
        },
      },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.caption?.startsWith('Derived view')).toBe(true);
      expect(r.caption).toContain('Panel A');
    }
  });

  it('cross-checks a self-describing spec.skill against the skillId', () => {
    const r = validateSkillInvocation('nest.spike_raster', spikeSpec({ skill: 'nest.voltage_trace' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.code === 'skill_mismatch')).toBe(true);
  });

  it('accepts a self-describing spec whose skill matches', () => {
    const r = validateSkillInvocation('nest.spike_raster', spikeSpec({ skill: 'nest.spike_raster' }));
    expect(r.ok).toBe(true);
  });

  it('suggests the nearest skill for a typo (didYouMean + example)', () => {
    const r = validateSkillInvocation('nest.spike_rastr', spikeSpec());
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const e = r.errors.find((x) => x.code === 'unknown_skill');
      expect(e?.didYouMean).toBe('nest.spike_raster');
      expect(e?.example).toBeDefined();
    }
  });

  it('rejects a scene that does not match the skill contract', () => {
    const r = validateSkillInvocation(
      'nest.spike_raster',
      spikeSpec({ scene: 'voltage-trace' }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.code === 'scene_mismatch')).toBe(true);
  });
});
