import { describe, it, expect } from 'vitest';
import { validateSkillInvocation } from '../core/skills/validateSkillInvocation';
import { getExamplePayload } from '../core/skills/examples';
import { provenanceParamConstraintError } from '../core/skills/provenanceKeys';

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
        times_ms: [0],
        series: [[-65]],
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
        times_ms: [0],
        series: [[-65]],
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

    const extraKnown = spikeSpec({
      provenance: {
        ...goodProv,
        declared_inputs: {
          ...goodProv.declared_inputs,
          sampling_interval: -1,
        },
      },
    });
    expect(validateSkillInvocation('nest.spike_raster', extraKnown).ok).toBe(false);
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
