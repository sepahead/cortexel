import { describe, expect, it } from 'vitest';
import {
  adaptEngramCorpusEntityGraph,
  type EngramCorpusEntityGraphResponse,
} from '../core/skills/corpusKnowledgeGraph';

function response(): EngramCorpusEntityGraphResponse {
  return {
    nodes: [
      {
        id: 'paper:p1',
        kind: 'paper',
        label: 'Paper one',
        family: 'LIF',
        reproducibility_class: 'nest_reproducible',
        brain_region: 'V1',
        paper_count: 0,
        n_neurons: 2,
        n_synapses: 1,
        pagerank: null,
      },
      {
        id: 'model:m1',
        kind: 'model',
        label: 'iaf_psc_alpha',
        family: 'LIF',
        model_type: 'neuron',
        paper_count: 1,
        n_neurons: 0,
        n_synapses: 0,
        pagerank: 0.5,
      },
      {
        id: 'family:f1',
        kind: 'family',
        label: 'LIF lineage',
        family: 'LIF',
        paper_count: 1,
        n_neurons: 0,
        n_synapses: 0,
      },
    ],
    edges: [
      {
        source: 'paper:p1',
        target: 'model:m1',
        kind: 'instantiates',
      },
      {
        source: 'model:m1',
        target: 'family:f1',
        kind: 'belongs_to_family',
      },
    ],
    paper_count: 1,
    model_count: 1,
    family_count: 1,
    edge_counts: { instantiates: 1, belongs_to_family: 1 },
    kinds: ['family', 'model', 'paper'],
    generated_at: '2026-07-11T12:00:00Z',
    advisory_only: true,
    calibrated_posterior: false,
    is_paper_local_evidence: false,
  };
}

const options = {
  graphId: 'engram-corpus-entities',
  graphSource: 'engram:corpus_entity_graph',
  graphSnapshotId: 'sha256:abc123',
};

describe('adaptEngramCorpusEntityGraph', () => {
  it('projects every Engram entity field and binds each record to the snapshot', () => {
    const result = adaptEngramCorpusEntityGraph(response(), options);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.params).toMatchObject({
      graph_id: options.graphId,
      graph_source: options.graphSource,
      graph_snapshot_id: options.graphSnapshotId,
      graph_scope: 'corpus_entity',
      generated_at: '2026-07-11T12:00:00Z',
    });
    expect(result.params.nodes[0].attributes).toEqual({
      family: 'LIF',
      model_type: null,
      reproducibility_class: 'nest_reproducible',
      brain_region: 'V1',
      paper_count: 0,
      n_neurons: 2,
      n_synapses: 1,
      pagerank: null,
    });
    expect(result.params.nodes[0].evidence).toEqual([
      expect.objectContaining({
        kind: 'graph_snapshot_record',
        record_id: 'node:paper:p1',
      }),
    ]);
    expect(result.params.edges[0]).toMatchObject({
      id: 'edge:8:paper:p112:instantiates8:model:m1',
      epistemic: {
        status: 'derived_advisory',
        advisory_only: true,
        is_paper_local_evidence: false,
        calibrated_posterior: false,
      },
    });
  });

  it('maps only meaningful Engram confidence fields into discriminated scores', () => {
    const graph = response();
    graph.nodes = [...graph.nodes, {
      id: 'paper:p2',
      kind: 'paper',
      label: 'Paper two',
      family: 'LIF',
      paper_count: 0,
      n_neurons: 0,
      n_synapses: 0,
    }];
    graph.paper_count = 2;
    graph.edges = [...graph.edges, {
      source: 'paper:p1',
      target: 'paper:p2',
      kind: 'cites',
      confidence: 0.81,
    }];
    graph.edge_counts = { ...graph.edge_counts, cites: 1 };
    const result = adaptEngramCorpusEntityGraph(graph, options);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.params.edges[2].uncalibrated_score).toEqual({
      kind: 'citation_resolution_confidence',
      value: 0.81,
      calibrated_posterior: false,
    });

    graph.edges[0].confidence = 0.9;
    expect(adaptEngramCorpusEntityGraph(graph, options).ok).toBe(false);
  });

  it('preserves explicit parallel assertion ids and rejects indistinguishable legacy duplicates', () => {
    const graph = response();
    graph.edges = [
      {
        id: 'membership-from-cluster-a',
        source: 'paper:p1',
        target: 'model:m1',
        kind: 'instantiates',
      },
      {
        id: 'membership-from-cluster-b',
        source: 'paper:p1',
        target: 'model:m1',
        kind: 'instantiates',
      },
    ];
    graph.edge_counts = { instantiates: 2 };
    const explicit = adaptEngramCorpusEntityGraph(graph, options);
    expect(explicit.ok).toBe(true);
    if (explicit.ok) {
      expect(explicit.params.edges.map((edge) => edge.id)).toEqual([
        'membership-from-cluster-a',
        'membership-from-cluster-b',
      ]);
    }

    delete graph.edges[0].id;
    delete graph.edges[1].id;
    const legacy = adaptEngramCorpusEntityGraph(graph, options);
    expect(legacy.ok).toBe(false);
    if (!legacy.ok) expect(legacy.errors.join(' ')).toMatch(/duplicate edge id/);
  });

  it('fails closed on dishonest flags and inconsistent redundant summaries', () => {
    const dishonest = { ...response(), calibrated_posterior: true };
    expect(adaptEngramCorpusEntityGraph(dishonest, options).ok).toBe(false);

    const inconsistent = response();
    inconsistent.paper_count = 99;
    const result = adaptEngramCorpusEntityGraph(inconsistent, options);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/paper_count/);
  });

  it('is a no-throw unknown-input boundary with fail-fast outer budgets', () => {
    for (const value of [null, [], 42, 'graph']) {
      expect(() => adaptEngramCorpusEntityGraph(value, options)).not.toThrow();
      expect(adaptEngramCorpusEntityGraph(value, options).ok).toBe(false);
    }

    const oversized = { ...response(), nodes: new Array(1_000_000) };
    const budgeted = adaptEngramCorpusEntityGraph(oversized, options);
    expect(budgeted.ok).toBe(false);
    if (!budgeted.ok) expect(budgeted.errors[0]).toMatch(/at most 1000/);

    const hostile = new Proxy({}, {
      getOwnPropertyDescriptor() {
        throw new Error('proxy trap');
      },
    });
    expect(() => adaptEngramCorpusEntityGraph(hostile, options)).not.toThrow();
    expect(adaptEngramCorpusEntityGraph(hostile, options).ok).toBe(false);
    expect(adaptEngramCorpusEntityGraph(response(), {
      ...options,
      graphId: 'x'.repeat(10_000),
    }).ok).toBe(false);
  });

  it('passes only exact-JSON defensive clones to Zod and never invokes accessors', () => {
    for (const field of ['nodes', 'edges', 'kinds'] as const) {
      let reads = 0;
      const graph = response() as unknown as Record<string, unknown>;
      const source = graph[field] as unknown[];
      const accessorArray = [...source];
      Object.defineProperty(accessorArray, '0', {
        configurable: true,
        enumerable: true,
        get() {
          reads += 1;
          return source[0];
        },
      });
      graph[field] = accessorArray;
      expect(adaptEngramCorpusEntityGraph(graph, options).ok, field).toBe(false);
      expect(reads, field).toBe(0);
    }

    let nestedReads = 0;
    const nested = response();
    const node = { ...nested.nodes[0] } as Record<string, unknown>;
    Object.defineProperty(node, 'label', {
      configurable: true,
      enumerable: true,
      get() {
        nestedReads += 1;
        return 'dynamic label';
      },
    });
    nested.nodes = [node as unknown as EngramCorpusEntityGraphResponse['nodes'][number],
      ...nested.nodes.slice(1)];
    expect(adaptEngramCorpusEntityGraph(nested, options).ok).toBe(false);
    expect(nestedReads).toBe(0);

    let optionReads = 0;
    const accessorOptions = { ...options } as Record<string, unknown>;
    Object.defineProperty(accessorOptions, 'graphId', {
      configurable: true,
      enumerable: true,
      get() {
        optionReads += 1;
        return 'dynamic-id';
      },
    });
    expect(adaptEngramCorpusEntityGraph(response(), accessorOptions).ok).toBe(false);
    expect(optionReads).toBe(0);
  });

  it('rejects non-RFC3339 and calendar-invalid generated_at values', () => {
    for (const timestamp of [
      '2026-07-11T12:00Z',
      '2026-07-11T12:00:00',
      '2026-02-29T12:00:00Z',
      '2026-07-11 12:00:00Z',
    ]) {
      const graph = response();
      graph.generated_at = timestamp;
      expect(adaptEngramCorpusEntityGraph(graph, options).ok, timestamp).toBe(false);
    }
  });

  it('rejects invalid numeric evidence metadata before mapping it into attributes', () => {
    const badCount = response();
    badCount.nodes[0].n_neurons = -1;
    expect(adaptEngramCorpusEntityGraph(badCount, options).ok).toBe(false);

    const badRank = response();
    badRank.nodes[1].pagerank = Number.NaN;
    expect(adaptEngramCorpusEntityGraph(badRank, options).ok).toBe(false);

    const negativeZero = response();
    negativeZero.nodes[0].n_neurons = -0;
    expect(adaptEngramCorpusEntityGraph(negativeZero, options).ok).toBe(false);

    const badConfidence = response();
    badConfidence.nodes = [...badConfidence.nodes, {
      id: 'paper:p2', kind: 'paper', label: 'P2', family: 'LIF', paper_count: 0,
      n_neurons: 0, n_synapses: 0,
    }];
    badConfidence.paper_count = 2;
    badConfidence.edges = [...badConfidence.edges, {
      source: 'paper:p1', target: 'paper:p2', kind: 'cites', confidence: 1.1,
    }];
    badConfidence.edge_counts = { ...badConfidence.edge_counts, cites: 1 };
    expect(adaptEngramCorpusEntityGraph(badConfidence, options).ok).toBe(false);
  });

  it('uses collision-free bounded legacy ids even when endpoint ids contain delimiters', () => {
    const node = (id: string) => ({
      id,
      kind: 'paper' as const,
      label: id,
      family: 'none',
      paper_count: 0,
      n_neurons: 0,
      n_synapses: 0,
    });
    const graph: EngramCorpusEntityGraphResponse = {
      ...response(),
      nodes: [node('a->cites->b'), node('c'), node('a'), node('b->cites->c')],
      edges: [
        { source: 'a->cites->b', target: 'c', kind: 'cites' },
        { source: 'a', target: 'b->cites->c', kind: 'cites' },
      ],
      paper_count: 4,
      model_count: 0,
      family_count: 0,
      edge_counts: { cites: 2 },
      kinds: ['paper'],
    };
    const result = adaptEngramCorpusEntityGraph(graph, options);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.params.edges[0].id).not.toBe(result.params.edges[1].id);
    expect(result.params.edges.every((edge) => edge.id.length <= 320)).toBe(true);
  });
});
