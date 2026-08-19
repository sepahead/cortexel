import { describe, expect, it } from 'vitest';
import { canonicalDigest } from '../src/core/canonicalize';
import { buildVizSpec } from '../core/skills/authoring';
import {
  adaptEngramCorpusEntityGraph,
  type EngramReceiptBoundCorpusEntityGraphResponse,
} from '../core/skills/corpusKnowledgeGraph';
import {
  prepareCorpusKnowledgeGraphFigureJson,
  serializePreparedKnowledgeGraphPresentation,
} from '../src/knowledge-graph/index';

// End-to-end coverage for the Engram (Paper2Brain) corpus entity-graph
// integration: the receipt-bound adapter branch, its fail-closed negative
// paths, and the complete adapter -> strict gate -> caption-bound
// presentation preparation flow an Engram agent runs.

type ReceiptGraph = EngramReceiptBoundCorpusEntityGraphResponse;

const IDENTITY_DERIVATION = {
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
} as const;

function receiptSource(paperId: string) {
  return {
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
  };
}

function baseReceipt() {
  return {
    schema_version: 'engram.corpus-derivation-receipt.v2',
    derivation_kind: 'entity_graph',
    algorithm_version: 'entity-graph-v1',
    graph_store_binding_id: `wiki-v1:${'1'.repeat(32)}`,
    source_revision: `sha256:${'2'.repeat(64)}`,
    source_revision_created_at: '2026-08-19T09:00:00Z',
    eligibility_decision_set_sha256: '3'.repeat(64),
    sources: [receiptSource('p1')],
    eligible_paper_count: 1,
    identity_derivation: IDENTITY_DERIVATION,
    parent_output_sha256: '4'.repeat(64),
    input_sha256: '5'.repeat(64),
    output_hash_scope: 'response_without_derivation_receipt',
    output_sha256: '6'.repeat(64),
    receipt_sha256: '7'.repeat(64),
    advisory_only: true,
    cross_store_evidence_authority: false,
    is_paper_local_evidence: false,
    calibrated_posterior: false,
  };
}

function receiptBoundResponse(): ReceiptGraph {
  return {
    nodes: [
      {
        id: 'family:f1',
        kind: 'family',
        label: 'LIF lineage',
        family: 'LIF',
        paper_count: 1,
        n_neurons: 0,
        n_synapses: 0,
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
    ],
    edges: [
      { source: 'model:m1', target: 'family:f1', kind: 'belongs_to_family' },
      { source: 'paper:p1', target: 'model:m1', kind: 'instantiates' },
    ],
    paper_count: 1,
    model_count: 1,
    family_count: 1,
    edge_counts: { belongs_to_family: 1, instantiates: 1 },
    kinds: ['family', 'model', 'paper'],
    generated_at: '2026-08-19T09:00:00Z',
    advisory_only: true,
    calibrated_posterior: false,
    is_paper_local_evidence: false,
    identity_derivation: IDENTITY_DERIVATION,
    derivation_receipt: baseReceipt(),
  };
}

function optionsFor(graph: unknown, overrides: Partial<{
  graphId: string;
  graphSource: string;
  graphSnapshotId: string;
}> = {}) {
  return {
    graphId: 'engram:corpus-entity',
    graphSource: 'engram:/api/knowledge_graph/corpus_entity_graph',
    graphSnapshotId: canonicalDigest(graph),
    ...overrides,
  };
}

function adapt(graph: unknown, options?: ReturnType<typeof optionsFor>) {
  return adaptEngramCorpusEntityGraph(graph, options ?? optionsFor(graph));
}

describe('Engram receipt-bound adapter negative paths', () => {
  it('rejects duplicate or non-canonically-ordered nodes', () => {
    const duplicate = receiptBoundResponse();
    duplicate.nodes = [...duplicate.nodes, { ...duplicate.nodes[0]! }];
    expect(adapt(duplicate).ok).toBe(false);

    const unsorted = receiptBoundResponse();
    unsorted.nodes = [...unsorted.nodes].reverse();
    expect(adapt(unsorted).ok).toBe(false);
  });

  it('rejects duplicate, non-canonical, self, and dangling edges', () => {
    const duplicateEdge = receiptBoundResponse();
    duplicateEdge.edges = [
      ...duplicateEdge.edges,
      { ...duplicateEdge.edges[0]! },
    ];
    duplicateEdge.edge_counts = { belongs_to_family: 2, instantiates: 1 };
    expect(adapt(duplicateEdge).ok).toBe(false);

    const unsorted = receiptBoundResponse();
    unsorted.edges = [...unsorted.edges].reverse();
    expect(adapt(unsorted).ok).toBe(false);

    const selfEdge = receiptBoundResponse();
    selfEdge.edges = [
      { source: 'paper:p1', target: 'paper:p1', kind: 'cites' as const },
      ...selfEdge.edges,
    ].sort((left, right) => {
      const l = [left.kind, left.source, left.target];
      const r = [right.kind, right.source, right.target];
      for (let i = 0; i < 3; i += 1) {
        if (l[i]! < r[i]!) return -1;
        if (l[i]! > r[i]!) return 1;
      }
      return 0;
    });
    selfEdge.edge_counts = { ...selfEdge.edge_counts, cites: 1 };
    expect(adapt(selfEdge).ok).toBe(false);

    const dangling = receiptBoundResponse();
    dangling.edges = [
      ...dangling.edges,
      { source: 'paper:p1', target: 'paper:ghost', kind: 'cites' as const },
    ].sort((left, right) => {
      const l = [left.kind, left.source, left.target];
      const r = [right.kind, right.source, right.target];
      for (let i = 0; i < 3; i += 1) {
        if (l[i]! < r[i]!) return -1;
        if (l[i]! > r[i]!) return 1;
      }
      return 0;
    });
    dangling.edge_counts = { ...dangling.edge_counts, cites: 1 };
    expect(adapt(dangling).ok).toBe(false);
  });

  it('rejects an inconsistent source roster', () => {
    const badPath = receiptBoundResponse();
    badPath.derivation_receipt = {
      ...baseReceipt(),
      sources: [{ ...receiptSource('p1'), component_path: 'store/p1.json' }],
    };
    expect(adapt(badPath).ok).toBe(false);

    const badBinding = receiptBoundResponse();
    badBinding.derivation_receipt = {
      ...baseReceipt(),
      sources: [{
        ...receiptSource('p1'),
        graph_store_binding_id: `wiki-v2:${'9'.repeat(32)}`,
      }],
    };
    expect(adapt(badBinding).ok).toBe(false);

    const extraSource = receiptBoundResponse();
    extraSource.derivation_receipt = {
      ...baseReceipt(),
      sources: [receiptSource('p1'), receiptSource('p2')],
    };
    expect(adapt(extraSource).ok).toBe(false);
  });

  it('rejects a roster that does not equal the paper-node roster', () => {
    const missingPaperNode = receiptBoundResponse();
    missingPaperNode.nodes = missingPaperNode.nodes.filter(
      (node) => node.kind !== 'paper',
    );
    missingPaperNode.edges = [];
    missingPaperNode.paper_count = 1;
    missingPaperNode.model_count = 1;
    missingPaperNode.family_count = 1;
    missingPaperNode.edge_counts = {};
    missingPaperNode.kinds = ['family', 'model'];
    expect(adapt(missingPaperNode).ok).toBe(false);
  });

  it('rejects a receipt whose identity derivation diverges from the summary', () => {
    const divergent = receiptBoundResponse();
    divergent.derivation_receipt = {
      ...baseReceipt(),
      identity_derivation: {
        ...IDENTITY_DERIVATION,
        signatures_considered: 2,
      },
    };
    const result = adapt(divergent);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(' ')).toMatch(/identity derivation/);
    }
  });

  it('rejects an abstained derivation that emits identity entities', () => {
    const abstained = receiptBoundResponse();
    abstained.identity_derivation = {
      ...IDENTITY_DERIVATION,
      signatures_considered: 25_001,
      planned_pair_comparisons: 0,
      status: 'abstained',
      abstention_reason: 'identity_signature_input_budget_exceeded',
      comparison_mode: 'abstained',
      resolver_invoked: false,
    };
    abstained.derivation_receipt = {
      ...baseReceipt(),
      identity_derivation: abstained.identity_derivation,
    };
    // Identity entities (model/family nodes, membership edges) are present —
    // an abstained derivation may only emit paper nodes and cites edges.
    expect(adapt(abstained).ok).toBe(false);
  });

  it('rejects a wrong receipt identity literal', () => {
    const wrongVersion = receiptBoundResponse() as unknown as {
      derivation_receipt: Record<string, unknown>;
    };
    wrongVersion.derivation_receipt = {
      ...wrongVersion.derivation_receipt,
      schema_version: 'engram.corpus-derivation-receipt.v3',
    };
    expect(adapt(wrongVersion).ok).toBe(false);
  });

  it('binds the snapshot digest to the raw response bytes, not a normalized clone', () => {
    // A padded label survives canonical binding: the digest must be computed
    // over the exact captured response, and the adapter must accept it.
    const padded = receiptBoundResponse();
    padded.nodes = padded.nodes.map((node) => node.id === 'paper:p1'
      ? { ...node, label: 'Paper one ' }
      : node);
    const accepted = adapt(padded);
    expect(accepted.ok).toBe(true);

    // A digest computed over a whitespace-normalized variant does NOT bind
    // the raw response and must fail closed.
    const normalized = structuredClone(padded);
    normalized.nodes = normalized.nodes.map((node) => ({
      ...node,
      label: node.label.trim(),
    }));
    const mismatched = adapt(padded, optionsFor(padded, {
      graphSnapshotId: canonicalDigest(normalized),
    }));
    expect(mismatched.ok).toBe(false);
    if (!mismatched.ok) {
      expect(mismatched.errors.join(' ')).toMatch(/graphSnapshotId/);
    }
  });
});

describe('Engram (Paper2Brain) end-to-end flow', () => {
  it('adapts, gates, and caption-binds a receipt-bound corpus graph', () => {
    const graph = receiptBoundResponse();
    const adapted = adapt(graph);
    if (!adapted.ok) throw new Error(adapted.errors.join('\n'));
    expect(adapted.params.graph_snapshot_id).toBe(canonicalDigest(graph));
    expect(adapted.params.nodes.every(
      (node) => node.evidence.length === 1
        && node.evidence[0]!.kind === 'graph_snapshot_record'
        && node.evidence[0]!.evidence_id === adapted.params.graph_snapshot_id,
    )).toBe(true);

    const checked = buildVizSpec({
      skill: 'corpus.knowledge_graph',
      params: adapted.params,
      source: 'engram-agent:paper2brain',
      declaredInputs: {
        graph_source: adapted.params.graph_source,
        graph_snapshot_id: adapted.params.graph_snapshot_id,
        graph_scope: adapted.params.graph_scope,
        identity_advisory: true,
      },
    });
    if (!checked.ok) throw new Error(JSON.stringify(checked.errors));
    expect(checked.scene).toBe('knowledge-graph-3d');
    expect(checked.caption).toContain('Advisory');
    expect(checked.spec.skill).toBe('corpus.knowledge_graph');
    expect(typeof checked.spec.specVersion).toBe('string');

    // The validated spec survives serialization through the duplicate-safe
    // raw-text boundary and yields a caption-bound presentation.
    const prepared = prepareCorpusKnowledgeGraphFigureJson(
      JSON.stringify(checked.spec),
    );
    if (!prepared.ok) throw new Error(JSON.stringify(prepared.errors));
    expect(prepared.sourceInputAssurance).toEqual({
      boundary: 'raw_json_text',
      duplicateMembers: 'rejected_before_materialization',
    });
    expect(prepared.caption).toBe(checked.caption);
    expect(prepared.presentation.profile).toBe('corpus_entity');
    const serialized = serializePreparedKnowledgeGraphPresentation(
      prepared.presentation,
    );
    expect(typeof serialized).toBe('string');
    expect(serialized).toContain('cortexel-prepared-knowledge-graph-presentation.v1');

    // The honesty caption cannot be laundered away by re-authoring: a copy
    // claiming calibrated posterior evidence fails the strict gate.
    const dishonest = buildVizSpec({
      skill: 'corpus.knowledge_graph',
      params: adapted.params,
      source: 'engram-agent:paper2brain',
      declaredInputs: {
        graph_source: adapted.params.graph_source,
        graph_snapshot_id: adapted.params.graph_snapshot_id,
        graph_scope: adapted.params.graph_scope,
        identity_advisory: true,
      },
      provenance: { calibrated_posterior: true } as never,
    });
    expect(dishonest.ok).toBe(false);
  });

  it('fails closed before any figure exists when the receipt is tampered', () => {
    const graph = receiptBoundResponse();
    const snapshotId = canonicalDigest(graph);
    const tampered = structuredClone(graph);
    tampered.nodes[2]!.label = 'Paper one (revised claims)';
    const result = adapt(tampered, optionsFor(tampered, {
      graphSnapshotId: snapshotId,
    }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(' ')).toMatch(/graphSnapshotId/);
    }
  });
});
