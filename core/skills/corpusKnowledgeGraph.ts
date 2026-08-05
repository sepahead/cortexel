// Pure, no-throw Engram CorpusEntityGraphResponse -> corpus.knowledge_graph adapter.
// The adapter is a JSON boundary: TypeScript types document the upstream shape,
// while the implementation accepts unknown, preflights resource budgets, and
// validates before it maps a single record.

import { z } from 'zod';
import { canonicalDigest, canonicalize } from '../../src/core/canonicalize.js';
import { formatValidationIssues, safeErrorMessage } from '../safeRuntime';
import { JsonParamsSchema } from '../vizSpec';
import {
  CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS,
  CORPUS_KNOWLEDGE_GRAPH_NODE_KINDS,
  KNOWLEDGE_GRAPH_LIMITS,
  KnowledgeGraph3DParamsSchema,
  PARAM_LIMITS,
  Rfc3339TimestampSchema,
  type KnowledgeGraph3DParams,
} from './params';

export type EngramCorpusEntityNodeKind =
  (typeof CORPUS_KNOWLEDGE_GRAPH_NODE_KINDS)[number];
export type EngramCorpusEntityEdgeKind =
  (typeof CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS)[number];
export type EngramReceiptBoundCorpusEntityEdgeKind = Exclude<
  EngramCorpusEntityEdgeKind,
  'same_as'
>;
export type EngramCorpusEvidenceReference =
  KnowledgeGraph3DParams['nodes'][number]['evidence'][number];

export interface EngramCorpusEntityNode {
  id: string;
  kind: EngramCorpusEntityNodeKind;
  label: string;
  family: string;
  model_type?: string | null;
  reproducibility_class?: string | null;
  brain_region?: string | null;
  paper_count: number;
  n_neurons: number;
  n_synapses: number;
  pagerank?: number | null;
  /** Upstream-supplied references retained exactly; Cortexel never invents anchors. */
  evidence: readonly EngramCorpusEvidenceReference[];
}

export interface EngramCorpusEntityEdge {
  /** Newer producers should supply this. A legacy response may omit it only
   * when source/kind/target identifies exactly one assertion. */
  id?: string;
  source: string;
  target: string;
  kind: EngramCorpusEntityEdgeKind;
  /** Optional upstream-declared score meaning. A naked `confidence` is rejected. */
  uncalibrated_score?: {
    kind: 'citation_resolution_confidence' | 'structural_similarity';
    value: number;
    calibrated_posterior: false;
  } | null;
  /** Upstream-supplied references retained exactly; Cortexel never invents anchors. */
  evidence: readonly EngramCorpusEvidenceReference[];
}

export interface EngramCorpusEntityGraphResponse {
  nodes: readonly EngramCorpusEntityNode[];
  edges: readonly EngramCorpusEntityEdge[];
  paper_count: number;
  model_count: number;
  family_count: number;
  edge_counts: Readonly<Record<string, number>>;
  kinds: readonly string[];
  generated_at: string;
  advisory_only: true;
  calibrated_posterior: false;
  is_paper_local_evidence: false;
}

/** Current Engram response: one immutable derivation receipt binds the complete
 * response instead of repeating caller-authored evidence on every record. */
export interface EngramReceiptBoundCorpusEntityGraphResponse {
  nodes: readonly Omit<EngramCorpusEntityNode, 'evidence'>[];
  edges: readonly {
    source: string;
    target: string;
    kind: EngramReceiptBoundCorpusEntityEdgeKind;
    confidence?: number | null;
  }[];
  paper_count: number;
  model_count: number;
  family_count: number;
  edge_counts: Readonly<Record<string, number>>;
  kinds: readonly string[];
  generated_at: string;
  identity_derivation: unknown;
  derivation_receipt: unknown;
  advisory_only: true;
  calibrated_posterior: false;
  is_paper_local_evidence: false;
}

export interface AdaptEngramCorpusEntityGraphOptions {
  graphId: string;
  graphSource: string;
  /** Immutable source revision, digest, or archive id. */
  graphSnapshotId: string;
}

export type AdaptEngramCorpusEntityGraphResult =
  | { ok: true; params: KnowledgeGraph3DParams }
  | { ok: false; errors: string[] };

const safeCount = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER)
  .refine((value) => !Object.is(value, -0), 'counts must not be negative zero');
const unitInterval = z
  .number()
  .min(0)
  .max(1)
  .refine((value) => !Object.is(value, -0), 'scores must not be negative zero');
const boundedSourceText = (max: number) => z.string().trim().min(1).max(max);
const nullableAttributeText = z.string().max(200).nullable().optional();
const EngramEvidenceSchema = z
  .array(JsonParamsSchema)
  .min(1)
  .max(KNOWLEDGE_GRAPH_LIMITS.maxEvidenceRefsPerElement);

const EngramNodeBaseShape = {
  id: boundedSourceText(120),
  kind: z.enum(CORPUS_KNOWLEDGE_GRAPH_NODE_KINDS),
  label: boundedSourceText(240),
  family: z.string().max(200),
  model_type: nullableAttributeText,
  reproducibility_class: nullableAttributeText,
  brain_region: nullableAttributeText,
  paper_count: safeCount,
  n_neurons: safeCount,
  n_synapses: safeCount,
  pagerank: unitInterval.nullable().optional(),
} as const;

const EngramNodeSchema = z
  .object({
    ...EngramNodeBaseShape,
    evidence: EngramEvidenceSchema,
  })
  .strict();

const EngramReceiptNodeSchema = z.object(EngramNodeBaseShape).strict();

const EngramEdgeSchema = z
  .object({
    id: boundedSourceText(320).optional(),
    source: boundedSourceText(120),
    target: boundedSourceText(120),
    kind: z.enum(CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS),
    uncalibrated_score: z
      .object({
        kind: z.enum(['citation_resolution_confidence', 'structural_similarity']),
        value: unitInterval,
        calibrated_posterior: z.literal(false),
      })
      .strict()
      .nullable()
      .optional(),
    evidence: EngramEvidenceSchema,
  })
  .strict();

const EngramReceiptEdgeSchema = z
  .object({
    source: boundedSourceText(120),
    target: boundedSourceText(120),
    kind: z.enum(['cites', 'instantiates', 'variant_of', 'belongs_to_family']),
    confidence: unitInterval.nullable().optional(),
  })
  .strict();

const EngramGraphSummaryShape = {
  paper_count: safeCount,
  model_count: safeCount,
  family_count: safeCount,
  edge_counts: z.partialRecord(z.enum(CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS), safeCount),
  kinds: z.array(z.enum(CORPUS_KNOWLEDGE_GRAPH_NODE_KINDS)).max(3),
  generated_at: Rfc3339TimestampSchema,
  advisory_only: z.literal(true),
  calibrated_posterior: z.literal(false),
  is_paper_local_evidence: z.literal(false),
} as const;

const EngramGraphSchema = z
  .object({
    nodes: z.array(EngramNodeSchema).max(PARAM_LIMITS.maxGraphNodes),
    edges: z.array(EngramEdgeSchema).max(PARAM_LIMITS.maxGraphEdges),
    ...EngramGraphSummaryShape,
  })
  .strict();

const sha256Hex = z.string().regex(/^[0-9a-f]{64}$/u);
const CorpusIdentityDerivationSchema = z
  .object({
    schema_version: z.literal('engram.corpus-identity-derivation.v1'),
    policy_version: z.literal('measured-alpha-exact-block-pair-budget-v1'),
    signatures_considered: safeCount,
    identity_block_count: safeCount,
    largest_identity_block_signatures: safeCount,
    planned_pair_comparisons: safeCount,
    max_signatures: z.literal(25_000),
    max_identity_block_signatures: z.literal(250),
    max_pair_comparisons: z.literal(31_125),
    status: z.enum(['completed', 'abstained']),
    abstention_reason: z
      .enum([
        'identity_signature_input_budget_exceeded',
        'identity_block_signature_budget_exceeded',
        'identity_pair_comparison_budget_exceeded',
      ])
      .nullable(),
    comparison_mode: z.enum(['exact_exhaustive', 'abstained']),
    resolver_invoked: z.boolean(),
    candidate_pair_prefilter: z.literal(false),
  })
  .strict()
  .superRefine((value, context) => {
    const chooseTwo = (count: number): number => count * (count - 1) / 2;
    const countsAreClosed = value.signatures_considered === 0
      ? value.identity_block_count === 0
        && value.largest_identity_block_signatures === 0
        && value.planned_pair_comparisons === 0
      : value.identity_block_count >= 1
        && value.identity_block_count <= value.signatures_considered
        && value.largest_identity_block_signatures >= 1
        && value.largest_identity_block_signatures <= value.signatures_considered
        && value.planned_pair_comparisons
          >= chooseTwo(value.largest_identity_block_signatures)
        && value.planned_pair_comparisons <= chooseTwo(value.signatures_considered);
    if (!countsAreClosed) {
      context.addIssue({ code: 'custom', message: 'identity derivation counts are inconsistent' });
      return;
    }
    const expectedReason = value.signatures_considered > 25_000
      ? 'identity_signature_input_budget_exceeded'
      : value.largest_identity_block_signatures > 250
        ? 'identity_block_signature_budget_exceeded'
        : value.planned_pair_comparisons > 31_125
          ? 'identity_pair_comparison_budget_exceeded'
          : null;
    const statusIsClosed = expectedReason === null
      ? value.status === 'completed'
        && value.abstention_reason === null
        && value.comparison_mode === 'exact_exhaustive'
        && value.resolver_invoked
      : value.status === 'abstained'
        && value.abstention_reason === expectedReason
        && value.comparison_mode === 'abstained'
        && !value.resolver_invoked;
    if (!statusIsClosed) {
      context.addIssue({ code: 'custom', message: 'identity derivation status is inconsistent' });
    }
  });

const CorpusDerivationSourceSchema = z
  .object({
    paper_id: z.string().regex(/^[a-z0-9][a-z0-9_.:-]{0,179}$/u),
    component_path: z.string().min(13).max(1_024),
    component_sha256: sha256Hex,
    component_bytes: safeCount.min(1).max(268_435_456),
    pipeline_run_id: boundedSourceText(512),
    graph_store_binding_id: z.string().regex(/^wiki-v1:[0-9a-f]{32}$/u),
    knowledge_graph_sha256: sha256Hex,
    eligibility_schema_version: boundedSourceText(128),
    eligibility_decision_sha256: sha256Hex,
    eligibility_receipt_sha256: sha256Hex,
    eligibility_policy_sha256: sha256Hex,
    provider_plan_sha256: sha256Hex,
    provider_execution_receipt_sha256: sha256Hex,
    evidence_plane_sha256: sha256Hex,
    qualified_payload_sha256: sha256Hex,
  })
  .strict();

const ReceiptSchema = z
  .object({
    schema_version: z.literal('engram.corpus-derivation-receipt.v2'),
    derivation_kind: z.literal('entity_graph'),
    algorithm_version: boundedSourceText(128),
    graph_store_binding_id: z.string().regex(/^wiki-v1:[0-9a-f]{32}$/u),
    source_revision: z.string().regex(/^sha256:[0-9a-f]{64}$/u),
    source_revision_created_at: Rfc3339TimestampSchema,
    eligibility_decision_set_sha256: sha256Hex,
    sources: z.array(CorpusDerivationSourceSchema).max(250),
    eligible_paper_count: safeCount,
    identity_derivation: CorpusIdentityDerivationSchema,
    parent_output_sha256: sha256Hex,
    input_sha256: sha256Hex,
    output_hash_scope: z.literal('response_without_derivation_receipt'),
    output_sha256: sha256Hex,
    receipt_sha256: sha256Hex,
    advisory_only: z.literal(true),
    cross_store_evidence_authority: z.literal(false),
    is_paper_local_evidence: z.literal(false),
    calibrated_posterior: z.literal(false),
  })
  .strict();

const ReceiptBoundEngramGraphSchema = z
  .object({
    nodes: z.array(EngramReceiptNodeSchema).max(PARAM_LIMITS.maxGraphNodes),
    edges: z.array(EngramReceiptEdgeSchema).max(PARAM_LIMITS.maxGraphEdges),
    ...EngramGraphSummaryShape,
    identity_derivation: CorpusIdentityDerivationSchema,
    derivation_receipt: ReceiptSchema,
  })
  .strict();

const AnyEngramGraphSchema = z.union([EngramGraphSchema, ReceiptBoundEngramGraphSchema]);

const AdapterOptionsSchema = z
  .object({
    graphId: boundedSourceText(160),
    graphSource: boundedSourceText(200),
    graphSnapshotId: boundedSourceText(200),
  })
  .strict();

type CheckedEngramGraph = z.infer<typeof AnyEngramGraphSchema>;
type CheckedEngramNode = CheckedEngramGraph['nodes'][number];
type CheckedEngramEdge = CheckedEngramGraph['edges'][number];

const DERIVED_ADVISORY = Object.freeze({
  status: 'derived_advisory' as const,
  advisory_only: true as const,
  is_paper_local_evidence: false as const,
  calibrated_posterior: false as const,
});

const EDGE_LABELS: Readonly<Record<EngramCorpusEntityEdgeKind, string>> = Object.freeze({
  cites: 'cites',
  same_as: 'same as (advisory)',
  variant_of: 'variant of (advisory)',
  instantiates: 'instantiates',
  belongs_to_family: 'belongs to family',
});

function preflightArrayLength(
  input: unknown,
  field: string,
  max: number,
): string | null {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return null;
  const descriptor = Object.getOwnPropertyDescriptor(input, field);
  if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) return null;
  if (!Array.isArray(descriptor.value)) return null;
  const length = Object.getOwnPropertyDescriptor(descriptor.value, 'length');
  if (!length || !('value' in length) || !Number.isSafeInteger(length.value)) return null;
  return length.value > max
    ? `${field} may contain at most ${max} items`
    : null;
}

function preflightRecordKeyCount(
  input: unknown,
  field: string,
  max: number,
): string | null {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return null;
  const descriptor = Object.getOwnPropertyDescriptor(input, field);
  if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) return null;
  const value = descriptor.value;
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  let count = 0;
  for (const key in value) {
    if (!Object.hasOwn(value, key)) continue;
    count += 1;
    if (count > max) return `${field} may contain at most ${max} properties`;
  }
  return null;
}

function nodeDetail(node: CheckedEngramNode): string | undefined {
  const fields = [
    node.family && `family ${node.family}`,
    node.model_type && `model type ${node.model_type}`,
    node.reproducibility_class && `reproducibility ${node.reproducibility_class}`,
    node.brain_region && `region ${node.brain_region}`,
  ].filter((field): field is string => !!field);
  return fields.length > 0 ? fields.join(' · ') : undefined;
}

/** Collision-free tuple encoding under the published UTF-16 length model. */
function legacyEdgeId(edge: CheckedEngramEdge): string {
  const field = (value: string): string => `${value.length}:${value}`;
  const [source, target] = edge.kind === 'same_as' && edge.target < edge.source
    ? [edge.target, edge.source]
    : [edge.source, edge.target];
  return `edge:${field(source)}${field(edge.kind)}${field(target)}`;
}

function summaryErrors(graph: CheckedEngramGraph): string[] {
  const nodeCounts = new Map<EngramCorpusEntityNodeKind, number>([
    ['paper', 0],
    ['model', 0],
    ['family', 0],
  ]);
  for (const node of graph.nodes) {
    nodeCounts.set(node.kind, (nodeCounts.get(node.kind) ?? 0) + 1);
  }
  const errors: string[] = [];
  for (const [kind, declared] of [
    ['paper', graph.paper_count],
    ['model', graph.model_count],
    ['family', graph.family_count],
  ] as const) {
    const actual = nodeCounts.get(kind) ?? 0;
    if (declared !== actual) {
      errors.push(`${kind}_count (${declared}) does not match the ${actual} ${kind} nodes`);
    }
  }

  const actualKinds = [...nodeCounts]
    .filter(([, count]) => count > 0)
    .map(([kind]) => kind)
    .sort();
  const declaredKinds = [...graph.kinds].sort();
  if (JSON.stringify(actualKinds) !== JSON.stringify(declaredKinds)) {
    errors.push('kinds does not equal the distinct node-kind set');
  }

  const edgeCounts = new Map<EngramCorpusEntityEdgeKind, number>();
  for (const edge of graph.edges) {
    edgeCounts.set(edge.kind, (edgeCounts.get(edge.kind) ?? 0) + 1);
  }
  for (const kind of CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS) {
    if ((graph.edge_counts[kind] ?? 0) !== (edgeCounts.get(kind) ?? 0)) {
      errors.push('edge_counts does not match the edge assertions');
      break;
    }
  }
  return errors;
}

function isReceiptBoundGraph(
  graph: CheckedEngramGraph,
): graph is z.infer<typeof ReceiptBoundEngramGraphSchema> {
  return 'derivation_receipt' in graph;
}

function receiptEvidence(
  graphSnapshotId: string,
  recordId: string,
): EngramCorpusEvidenceReference[] {
  return [{
    kind: 'graph_snapshot_record',
    evidence_id: graphSnapshotId,
    record_id: recordId,
  }];
}

function compareTuple(
  left: readonly string[],
  right: readonly string[],
): number {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    if (left[index]! < right[index]!) return -1;
    if (left[index]! > right[index]!) return 1;
  }
  return left.length - right.length;
}

function receiptGraphErrors(
  graph: z.infer<typeof ReceiptBoundEngramGraphSchema>,
  graphSnapshotId: string,
): string[] {
  const errors: string[] = [];
  const receipt = graph.derivation_receipt;
  if (
    receipt.source_revision_created_at !== graph.generated_at
    || receipt.eligible_paper_count !== graph.paper_count
    || canonicalize(receipt.identity_derivation) !== canonicalize(graph.identity_derivation)
  ) {
    errors.push('derivation receipt does not match the graph summary or identity derivation');
  }
  if (
    receipt.sources.length !== graph.paper_count
    || receipt.sources.some(
      (source, index, sources) =>
        source.component_path !== `graphs/${source.paper_id}.json`
        || source.graph_store_binding_id !== receipt.graph_store_binding_id
        || (index > 0 && sources[index - 1]!.paper_id >= source.paper_id),
    )
  ) {
    errors.push('derivation receipt source roster is inconsistent');
  }
  const nodeIds = graph.nodes.map((node) => node.id);
  if (
    nodeIds.some((id, index) => index > 0 && nodeIds[index - 1]! >= id)
    || new Set(nodeIds).size !== nodeIds.length
  ) {
    errors.push('receipt-bound graph nodes must be unique and canonically ordered');
  }
  const paperIds = graph.nodes
    .filter((node) => node.kind === 'paper')
    .map((node) => node.id)
    .sort();
  const sourcePaperIds = receipt.sources.map((source) => `paper:${source.paper_id}`);
  if (canonicalize(paperIds) !== canonicalize(sourcePaperIds)) {
    errors.push('receipt source roster does not equal the graph paper-node roster');
  }
  const nodeIdSet = new Set(nodeIds);
  const edgeKeys = graph.edges.map((edge) => [edge.kind, edge.source, edge.target] as const);
  if (
    edgeKeys.some((key, index) => index > 0 && compareTuple(edgeKeys[index - 1]!, key) >= 0)
    || graph.edges.some(
      (edge) => edge.source === edge.target
        || !nodeIdSet.has(edge.source)
        || !nodeIdSet.has(edge.target),
    )
  ) {
    errors.push('receipt-bound graph edges must be unique, canonical, non-self, and non-dangling');
  }
  if (
    graph.identity_derivation.status === 'abstained'
    && (
      graph.nodes.some((node) => node.kind !== 'paper')
      || graph.edges.some((edge) => edge.kind !== 'cites')
    )
  ) {
    errors.push('an abstained identity derivation cannot emit identity entities');
  }
  if (
    graph.edges.some(
      (edge) => edge.confidence != null
        && edge.kind !== 'cites'
        && edge.kind !== 'variant_of',
    )
  ) {
    errors.push('membership edges cannot carry an undeclared confidence meaning');
  }
  if (canonicalDigest(graph) !== graphSnapshotId) {
    errors.push('graphSnapshotId does not bind the complete receipt-bound response');
  }
  return errors;
}

/** Convert an unknown JSON value into strict 1.4 corpus graph params. This
 * function never creates a VizSpec or relaxes provenance; callers still pass
 * the result through buildVizSpec/validateSkillInvocation. */
export function adaptEngramCorpusEntityGraph(
  graph:
    | EngramCorpusEntityGraphResponse
    | EngramReceiptBoundCorpusEntityGraphResponse,
  options: AdaptEngramCorpusEntityGraphOptions,
): AdaptEngramCorpusEntityGraphResult;
export function adaptEngramCorpusEntityGraph(
  graph: unknown,
  options: unknown,
): AdaptEngramCorpusEntityGraphResult;
export function adaptEngramCorpusEntityGraph(
  graph: unknown,
  options: unknown,
): AdaptEngramCorpusEntityGraphResult {
  try {
    if (graph === null || typeof graph !== 'object' || Array.isArray(graph)) {
      return { ok: false, errors: ['(root): Engram corpus graph must be a plain object'] };
    }
    if (options === null || typeof options !== 'object' || Array.isArray(options)) {
      return { ok: false, errors: ['(root): adapter options must be a plain object'] };
    }
    const nodeBudget = preflightArrayLength(graph, 'nodes', PARAM_LIMITS.maxGraphNodes);
    if (nodeBudget) return { ok: false, errors: [nodeBudget] };
    const edgeBudget = preflightArrayLength(graph, 'edges', PARAM_LIMITS.maxGraphEdges);
    if (edgeBudget) return { ok: false, errors: [edgeBudget] };
    const kindsBudget = preflightArrayLength(graph, 'kinds', 3);
    if (kindsBudget) return { ok: false, errors: [kindsBudget] };
    const countsBudget = preflightRecordKeyCount(
      graph,
      'edge_counts',
      CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS.length,
    );
    if (countsBudget) return { ok: false, errors: [countsBudget] };

    // Snapshot the complete inputs through Cortexel's exact-JSON boundary before
    // Zod traverses them. In particular, array/object accessors are rejected via
    // descriptors without invocation, and the checked schemas only ever inspect
    // the immutable defensive clones.
    const graphSnapshot = JsonParamsSchema.safeParse(graph);
    if (!graphSnapshot.success) {
      return { ok: false, errors: formatValidationIssues(graphSnapshot.error.issues) };
    }
    const optionsSnapshot = JsonParamsSchema.safeParse(options);
    if (!optionsSnapshot.success) {
      return { ok: false, errors: formatValidationIssues(optionsSnapshot.error.issues) };
    }

    const checkedGraph = AnyEngramGraphSchema.safeParse(graphSnapshot.data);
    if (!checkedGraph.success) {
      return { ok: false, errors: formatValidationIssues(checkedGraph.error.issues) };
    }
    const checkedOptions = AdapterOptionsSchema.safeParse(optionsSnapshot.data);
    if (!checkedOptions.success) {
      return { ok: false, errors: formatValidationIssues(checkedOptions.error.issues) };
    }
    const graphValue = checkedGraph.data;
    const optionValue = checkedOptions.data;
    const summaries = summaryErrors(graphValue);
    if (summaries.length > 0) return { ok: false, errors: summaries };
    const receiptBound = isReceiptBoundGraph(graphValue);
    if (receiptBound) {
      const receiptErrors = receiptGraphErrors(graphValue, optionValue.graphSnapshotId);
      if (receiptErrors.length > 0) return { ok: false, errors: receiptErrors };
    }

    const params = {
      graph_id: optionValue.graphId,
      graph_source: optionValue.graphSource,
      graph_snapshot_id: optionValue.graphSnapshotId,
      graph_scope: 'corpus_entity',
      generated_at: graphValue.generated_at,
      nodes: graphValue.nodes.map((node) => {
        const detail = nodeDetail(node);
        return {
          id: node.id,
          kind: node.kind,
          label: node.label,
          ...(detail ? { detail } : {}),
          attributes: {
            family: node.family,
            model_type: node.model_type ?? null,
            reproducibility_class: node.reproducibility_class ?? null,
            brain_region: node.brain_region ?? null,
            paper_count: node.paper_count,
            n_neurons: node.n_neurons,
            n_synapses: node.n_synapses,
            pagerank: node.pagerank ?? null,
          },
          epistemic: { ...DERIVED_ADVISORY },
          evidence: receiptBound
            ? receiptEvidence(optionValue.graphSnapshotId, `node:${node.id}`)
            : 'evidence' in node ? node.evidence : [],
        };
      }),
      edges: graphValue.edges.map((edge) => {
        const id = ('id' in edge ? edge.id : undefined) ?? legacyEdgeId(edge);
        const score = receiptBound
          ? !('confidence' in edge) || edge.confidence == null
            ? undefined
            : {
                kind: edge.kind === 'cites'
                  ? 'citation_resolution_confidence' as const
                  : 'structural_similarity' as const,
                value: edge.confidence,
                calibrated_posterior: false as const,
              }
          : 'uncalibrated_score' in edge ? edge.uncalibrated_score : undefined;
        return {
          id,
          source: edge.source,
          target: edge.target,
          kind: edge.kind,
          label: EDGE_LABELS[edge.kind],
          attributes: {},
          epistemic: { ...DERIVED_ADVISORY },
          evidence: receiptBound
            ? receiptEvidence(optionValue.graphSnapshotId, `edge:${id}`)
            : 'evidence' in edge ? edge.evidence : [],
          ...(score ? { uncalibrated_score: score } : {}),
        };
      }),
    };

    const checked = KnowledgeGraph3DParamsSchema.safeParse(params);
    return checked.success
      ? { ok: true, params: checked.data }
      : { ok: false, errors: formatValidationIssues(checked.error.issues) };
  } catch (error) {
    return {
      ok: false,
      errors: [`could not safely inspect Engram corpus graph: ${safeErrorMessage(error)}`],
    };
  }
}
