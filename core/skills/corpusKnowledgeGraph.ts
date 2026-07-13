// Pure, no-throw Engram CorpusEntityGraphResponse -> corpus.knowledge_graph adapter.
// The adapter is a JSON boundary: TypeScript types document the upstream shape,
// while the implementation accepts unknown, preflights resource budgets, and
// validates before it maps a single record.

import { z } from 'zod';
import { formatValidationIssues, safeErrorMessage } from '../safeRuntime';
import { JsonParamsSchema } from '../vizSpec';
import {
  CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS,
  CORPUS_KNOWLEDGE_GRAPH_NODE_KINDS,
  KnowledgeGraph3DParamsSchema,
  PARAM_LIMITS,
  Rfc3339TimestampSchema,
  type KnowledgeGraph3DParams,
} from './params';

export type EngramCorpusEntityNodeKind =
  (typeof CORPUS_KNOWLEDGE_GRAPH_NODE_KINDS)[number];
export type EngramCorpusEntityEdgeKind =
  (typeof CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS)[number];

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
}

export interface EngramCorpusEntityEdge {
  /** Newer producers should supply this. A legacy response may omit it only
   * when source/kind/target identifies exactly one assertion. */
  id?: string;
  source: string;
  target: string;
  kind: EngramCorpusEntityEdgeKind;
  confidence?: number | null;
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

const EngramNodeSchema = z
  .object({
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
  })
  .strict();

const EngramEdgeSchema = z
  .object({
    id: boundedSourceText(320).optional(),
    source: boundedSourceText(120),
    target: boundedSourceText(120),
    kind: z.enum(CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS),
    confidence: unitInterval.nullable().optional(),
  })
  .strict();

const EngramGraphSchema = z
  .object({
    nodes: z.array(EngramNodeSchema).max(PARAM_LIMITS.maxGraphNodes),
    edges: z.array(EngramEdgeSchema).max(PARAM_LIMITS.maxGraphEdges),
    paper_count: safeCount,
    model_count: safeCount,
    family_count: safeCount,
    edge_counts: z.partialRecord(z.enum(CORPUS_KNOWLEDGE_GRAPH_EDGE_KINDS), safeCount),
    kinds: z.array(z.enum(CORPUS_KNOWLEDGE_GRAPH_NODE_KINDS)).max(3),
    generated_at: Rfc3339TimestampSchema,
    advisory_only: z.literal(true),
    calibrated_posterior: z.literal(false),
    is_paper_local_evidence: z.literal(false),
  })
  .strict();

const AdapterOptionsSchema = z
  .object({
    graphId: boundedSourceText(160),
    graphSource: boundedSourceText(200),
    graphSnapshotId: boundedSourceText(200),
  })
  .strict();

type CheckedEngramGraph = z.infer<typeof EngramGraphSchema>;
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
  return `edge:${field(edge.source)}${field(edge.kind)}${field(edge.target)}`;
}

function edgeScore(edge: CheckedEngramEdge): Record<string, unknown> | undefined {
  if (edge.confidence === undefined || edge.confidence === null) return undefined;
  if (edge.kind === 'cites') {
    return {
      kind: 'citation_resolution_confidence',
      value: edge.confidence,
      calibrated_posterior: false,
    };
  }
  if (edge.kind === 'same_as' || edge.kind === 'variant_of') {
    return {
      kind: 'structural_similarity',
      value: edge.confidence,
      calibrated_posterior: false,
    };
  }
  // This intentionally fails the downstream closed score discriminator: a
  // membership confidence has no declared meaning in the Engram response.
  return {
    kind: 'unsupported_membership_confidence',
    value: edge.confidence,
    calibrated_posterior: false,
  };
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

/** Convert an unknown JSON value into strict 1.4 corpus graph params. This
 * function never creates a VizSpec or relaxes provenance; callers still pass
 * the result through buildVizSpec/validateSkillInvocation. */
export function adaptEngramCorpusEntityGraph(
  graph: EngramCorpusEntityGraphResponse,
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

    const checkedGraph = EngramGraphSchema.safeParse(graphSnapshot.data);
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
          evidence: [{
            kind: 'graph_snapshot_record',
            evidence_id: `snapshot-node:${node.id}`,
            record_id: `node:${node.id}`,
          }],
        };
      }),
      edges: graphValue.edges.map((edge) => {
        const id = edge.id ?? legacyEdgeId(edge);
        const score = edgeScore(edge);
        return {
          id,
          source: edge.source,
          target: edge.target,
          kind: edge.kind,
          label: EDGE_LABELS[edge.kind],
          attributes: {},
          epistemic: { ...DERIVED_ADVISORY },
          evidence: [{
            kind: 'graph_snapshot_record',
            evidence_id: `snapshot-edge:${id}`,
            record_id: id,
          }],
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
