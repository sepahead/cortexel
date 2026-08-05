import { describe, expect, it } from 'vitest';
import { canonicalDigest } from '../src/core/canonicalize';
import {
  adaptEngramCorpusEntityGraph,
  type EngramCorpusEntityGraphResponse,
  type EngramReceiptBoundCorpusEntityGraphResponse,
} from '../core/skills/corpusKnowledgeGraph';

function evidence(evidenceId: string, recordId: string) {
  return [{
    kind: 'graph_snapshot_record' as const,
    evidence_id: evidenceId,
    record_id: recordId,
  }];
}

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
        evidence: evidence('source:paper:p1', 'record:paper:p1'),
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
        evidence: evidence('source:model:m1', 'record:model:m1'),
      },
      {
        id: 'family:f1',
        kind: 'family',
        label: 'LIF lineage',
        family: 'LIF',
        paper_count: 1,
        n_neurons: 0,
        n_synapses: 0,
        evidence: evidence('source:family:f1', 'record:family:f1'),
      },
    ],
    edges: [
      {
        source: 'paper:p1',
        target: 'model:m1',
        kind: 'instantiates',
        evidence: evidence('source:instantiates:p1:m1', 'record:instantiates:p1:m1'),
      },
      {
        source: 'model:m1',
        target: 'family:f1',
        kind: 'belongs_to_family',
        evidence: evidence('source:family:m1:f1', 'record:family:m1:f1'),
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

function receiptBoundResponse(): EngramReceiptBoundCorpusEntityGraphResponse {
  const legacy = response();
  const identityDerivation = {
    schema_version: 'engram.corpus-identity-derivation.v1',
    policy_version: 'measured-alpha-exact-block-pair-budget-v1',
    signatures_considered: 1,
    identity_block_count: 1,
    largest_identity_block_signatures: 1,
    planned_pair_comparisons: 0,
    max_signatures: 25_000,
    max_identity_block_signatures: 250,
    max_pair_comparisons: 31_125,
    status: 'completed',
    abstention_reason: null,
    comparison_mode: 'exact_exhaustive',
    resolver_invoked: true,
    candidate_pair_prefilter: false,
  };
  const source = (paperId: string) => ({
    paper_id: paperId,
    component_path: `graphs/${paperId}.json`,
    component_sha256: '8'.repeat(64),
    component_bytes: 100,
    pipeline_run_id: 'run-1',
    graph_store_binding_id: `wiki-v1:${'1'.repeat(32)}`,
    knowledge_graph_sha256: '9'.repeat(64),
    eligibility_schema_version: 'engram.corpus-eligibility.v1',
    eligibility_decision_sha256: 'a'.repeat(64),
    eligibility_receipt_sha256: 'b'.repeat(64),
    eligibility_policy_sha256: 'c'.repeat(64),
    provider_plan_sha256: 'd'.repeat(64),
    provider_execution_receipt_sha256: 'e'.repeat(64),
    evidence_plane_sha256: 'f'.repeat(64),
    qualified_payload_sha256: '0'.repeat(64),
  });
  return {
    ...legacy,
    nodes: legacy.nodes.map(({ evidence: _evidence, ...node }) => node),
    edges: legacy.edges.map((sourceEdge) => {
      if (sourceEdge.kind === 'same_as') throw new Error('fixture is not an entity edge');
      return {
        source: sourceEdge.source,
        target: sourceEdge.target,
        kind: sourceEdge.kind,
        ...(sourceEdge.uncalibrated_score
          ? { confidence: sourceEdge.uncalibrated_score.value }
          : {}),
      };
    }),
    identity_derivation: identityDerivation,
    derivation_receipt: {
      schema_version: 'engram.corpus-derivation-receipt.v2',
      derivation_kind: 'entity_graph',
      algorithm_version: 'entity-graph-v1',
      graph_store_binding_id: `wiki-v1:${'1'.repeat(32)}`,
      source_revision: `sha256:${'2'.repeat(64)}`,
      source_revision_created_at: legacy.generated_at,
      eligibility_decision_set_sha256: '3'.repeat(64),
      sources: [source('p1')],
      eligible_paper_count: 1,
      identity_derivation: identityDerivation,
      parent_output_sha256: '4'.repeat(64),
      input_sha256: '5'.repeat(64),
      output_hash_scope: 'response_without_derivation_receipt',
      output_sha256: '6'.repeat(64),
      receipt_sha256: '7'.repeat(64),
      advisory_only: true,
      cross_store_evidence_authority: false,
      is_paper_local_evidence: false,
      calibrated_posterior: false,
    },
  };
}

const options = {
  graphId: 'engram-corpus-entities',
  graphSource: 'engram:corpus_entity_graph',
  graphSnapshotId: 'sha256:abc123',
};

describe('adaptEngramCorpusEntityGraph', () => {
  it('projects every Engram entity field and retains upstream evidence without invention', () => {
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
        evidence_id: 'source:paper:p1',
        record_id: 'record:paper:p1',
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

  it('accepts current receipt-bound Engram responses without inventing scientific evidence', () => {
    const graph = receiptBoundResponse();
    graph.nodes = [
      ...graph.nodes,
      { ...graph.nodes[0], id: 'paper:p2', label: 'Paper two' },
    ].sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
    graph.paper_count = 2;
    graph.edges = [
      ...graph.edges,
      {
        source: 'paper:p1',
        target: 'paper:p2',
        kind: 'cites' as const,
        confidence: 0.75,
      },
    ].sort((left, right) => {
      const leftKey = [left.kind, left.source, left.target];
      const rightKey = [right.kind, right.source, right.target];
      for (let index = 0; index < leftKey.length; index += 1) {
        if (leftKey[index]! < rightKey[index]!) return -1;
        if (leftKey[index]! > rightKey[index]!) return 1;
      }
      return 0;
    });
    graph.edge_counts = { ...graph.edge_counts, cites: 1 };
    graph.derivation_receipt = {
      ...(graph.derivation_receipt as Record<string, unknown>),
      sources: [
        (graph.derivation_receipt as { sources: Array<Record<string, unknown>> }).sources[0],
        {
          ...(graph.derivation_receipt as { sources: Array<Record<string, unknown>> }).sources[0],
          paper_id: 'p2',
          component_path: 'graphs/p2.json',
        },
      ],
      eligible_paper_count: 2,
    };
    const receiptOptions = { ...options, graphSnapshotId: canonicalDigest(graph) };
    const result = adaptEngramCorpusEntityGraph(graph, receiptOptions);
    if (!result.ok) throw new Error(result.errors.join('\n'));
    expect(result.params.nodes.find((node) => node.id === 'paper:p1')?.evidence).toEqual([{
      kind: 'graph_snapshot_record',
      evidence_id: receiptOptions.graphSnapshotId,
      record_id: 'node:paper:p1',
    }]);
    expect(result.params.edges.find((edge) => edge.kind === 'cites')?.uncalibrated_score).toEqual({
      kind: 'citation_resolution_confidence',
      value: 0.75,
      calibrated_posterior: false,
    });
    expect(result.params.nodes[0].epistemic).toMatchObject({
      status: 'derived_advisory',
      calibrated_posterior: false,
    });
  });

  it('fails closed when the receipt-bound summary and receipt disagree', () => {
    const graph = receiptBoundResponse();
    graph.derivation_receipt = {
      ...(graph.derivation_receipt as Record<string, unknown>),
      source_revision_created_at: '2026-07-12T12:00:00Z',
    };
    expect(adaptEngramCorpusEntityGraph(graph, options)).toMatchObject({ ok: false });
  });

  it('fails closed when the caller snapshot id does not bind the receipt response', () => {
    expect(adaptEngramCorpusEntityGraph(receiptBoundResponse(), options)).toMatchObject({
      ok: false,
    });
  });

  it('does not guess a score meaning for Engram membership edges', () => {
    const graph = receiptBoundResponse();
    graph.edges = graph.edges.map((edge) => ({ ...edge, confidence: 0.8 }));
    expect(adaptEngramCorpusEntityGraph(graph, {
      ...options,
      graphSnapshotId: canonicalDigest(graph),
    })).toMatchObject({ ok: false });
  });

  it('fails closed when upstream omits an element evidence anchor', () => {
    const missingNodeEvidence = response() as unknown as {
      nodes: Array<Record<string, unknown>>;
    };
    delete missingNodeEvidence.nodes[0].evidence;
    expect(adaptEngramCorpusEntityGraph(missingNodeEvidence, options).ok).toBe(false);

    const missingEdgeEvidence = response() as unknown as {
      edges: Array<Record<string, unknown>>;
    };
    delete missingEdgeEvidence.edges[0].evidence;
    expect(adaptEngramCorpusEntityGraph(missingEdgeEvidence, options).ok).toBe(false);
  });

  it('requires Engram to declare an exact score discriminator', () => {
    const graph = response();
    graph.nodes = [...graph.nodes, {
      id: 'paper:p2',
      kind: 'paper',
      label: 'Paper two',
      family: 'LIF',
      paper_count: 0,
      n_neurons: 0,
      n_synapses: 0,
      evidence: evidence('source:paper:p2', 'record:paper:p2'),
    }];
    graph.paper_count = 2;
    graph.edges = [...graph.edges, {
      source: 'paper:p1',
      target: 'paper:p2',
      kind: 'cites',
      uncalibrated_score: {
        kind: 'citation_resolution_confidence',
        value: 0.81,
        calibrated_posterior: false,
      },
      evidence: evidence('source:cites:p1:p2', 'record:cites:p1:p2'),
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

    const naked = response() as unknown as {
      edges: Array<Record<string, unknown>>;
    };
    naked.edges[0].confidence = 0.9;
    expect(adaptEngramCorpusEntityGraph(naked, options).ok).toBe(false);

    const wrongMeaning = response();
    wrongMeaning.edges[0].uncalibrated_score = {
      kind: 'structural_similarity',
      value: 0.9,
      calibrated_posterior: false,
    };
    expect(adaptEngramCorpusEntityGraph(wrongMeaning, options).ok).toBe(false);
  });

  it('preserves explicit parallel assertion ids and rejects indistinguishable legacy duplicates', () => {
    const graph = response();
    graph.edges = [
      {
        id: 'membership-from-cluster-a',
        source: 'paper:p1',
        target: 'model:m1',
        kind: 'instantiates',
        evidence: evidence('source:cluster:a', 'record:cluster:a'),
      },
      {
        id: 'membership-from-cluster-b',
        source: 'paper:p1',
        target: 'model:m1',
        kind: 'instantiates',
        evidence: evidence('source:cluster:b', 'record:cluster:b'),
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

    const symmetric = response();
    symmetric.nodes = [
      {
        id: 'model:a',
        kind: 'model',
        label: 'Model A',
        family: 'LIF',
        paper_count: 0,
        n_neurons: 0,
        n_synapses: 0,
        evidence: evidence('source:model:a', 'record:model:a'),
      },
      {
        id: 'model:b',
        kind: 'model',
        label: 'Model B',
        family: 'LIF',
        paper_count: 0,
        n_neurons: 0,
        n_synapses: 0,
        evidence: evidence('source:model:b', 'record:model:b'),
      },
    ];
    symmetric.edges = [
      {
        source: 'model:a',
        target: 'model:b',
        kind: 'same_as',
        evidence: evidence('source:same:a:b', 'record:same:a:b'),
      },
      {
        source: 'model:b',
        target: 'model:a',
        kind: 'same_as',
        evidence: evidence('source:same:b:a', 'record:same:b:a'),
      },
    ];
    symmetric.paper_count = 0;
    symmetric.model_count = 2;
    symmetric.family_count = 0;
    symmetric.edge_counts = { same_as: 2 };
    symmetric.kinds = ['model'];
    const reverseLegacySameAs = adaptEngramCorpusEntityGraph(symmetric, options);
    expect(reverseLegacySameAs.ok).toBe(false);
    if (!reverseLegacySameAs.ok) {
      expect(reverseLegacySameAs.errors.join(' ')).toMatch(/duplicate edge id/);
    }

    symmetric.edges = [
      {
        id: 'claim:a',
        source: 'model:a',
        target: 'model:b',
        kind: 'same_as',
        evidence: evidence('source:claim:a', 'record:claim:a'),
      },
      {
        id: 'claim:b',
        source: 'model:b',
        target: 'model:a',
        kind: 'same_as',
        evidence: evidence('source:claim:b', 'record:claim:b'),
      },
    ];
    const explicitReverseSameAs = adaptEngramCorpusEntityGraph(symmetric, options);
    expect(explicitReverseSameAs.ok).toBe(true);
    if (explicitReverseSameAs.ok) {
      expect(explicitReverseSameAs.params.edges.map((edge) => edge.id)).toEqual([
        'claim:a',
        'claim:b',
      ]);
    }
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
      evidence: evidence('source:paper:p2', 'record:paper:p2'),
    }];
    badConfidence.paper_count = 2;
    badConfidence.edges = [...badConfidence.edges, {
      source: 'paper:p1',
      target: 'paper:p2',
      kind: 'cites',
      uncalibrated_score: {
        kind: 'citation_resolution_confidence',
        value: 1.1,
        calibrated_posterior: false,
      },
      evidence: evidence('source:cites:p1:p2', 'record:cites:p1:p2'),
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
      evidence: evidence(`source:${id}`, `record:${id}`),
    });
    const graph: EngramCorpusEntityGraphResponse = {
      ...response(),
      nodes: [node('a->cites->b'), node('c'), node('a'), node('b->cites->c')],
      edges: [
        {
          source: 'a->cites->b',
          target: 'c',
          kind: 'cites',
          evidence: evidence('source:first', 'record:first'),
        },
        {
          source: 'a',
          target: 'b->cites->c',
          kind: 'cites',
          evidence: evidence('source:second', 'record:second'),
        },
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
