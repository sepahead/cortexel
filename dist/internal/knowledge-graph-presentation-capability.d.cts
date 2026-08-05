import { t as CortexelError } from "../errors-DLTGhSm-.cjs";
import { n as KnowledgeGraph3DNode, o as KnowledgeGraphContext, t as KnowledgeGraph3DEdge } from "../knowledgeGraphPresentation.types-B_2wcZ1W.cjs";
import { PreparedKnowledgeGraphNominalBrand, PreparedKnowledgeGraphViewNominalBrand } from "#cortexel-knowledge-graph-presentation-brand";
//#region react/knowledgeGraphPresentationBudget.internal.d.ts
interface KnowledgeGraphPresentationBudgetReceiptV1 {
  /** Input-container/value occurrences inspected and copied, counted per alias occurrence. */
  readonly retainedOccurrences: number;
  /** UTF-16 code units read from accepted caller-supplied strings. */
  readonly sourceStringCodeUnits: number;
  /** Prototype, key, and descriptor inspection operations, including revalidation. */
  readonly inspectionWork: number;
}
//#endregion
//#region react/knowledgeGraphPresentation.internal.d.ts
declare const KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1: "cortexel-knowledge-graph-presentation-input.v1";
declare const PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1: "cortexel-prepared-knowledge-graph-presentation.v1";
declare const PREPARED_KNOWLEDGE_GRAPH_VIEW_V1: "cortexel-prepared-knowledge-graph-view.v1";
/** Public preparation contract for caller-owned generic visual records. */
interface KnowledgeGraphPresentationInputV1 {
  readonly contract: typeof KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1;
  readonly profile: 'generic_visual';
  readonly graphIdentity: string;
  readonly nodes: readonly KnowledgeGraph3DNode[];
  readonly edges: readonly KnowledgeGraph3DEdge[];
  readonly context?: never;
}
interface CorpusKnowledgeGraphPresentationInputV1 {
  readonly contract: typeof KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1;
  readonly profile: 'corpus_entity';
  readonly nodes: readonly KnowledgeGraph3DNode[];
  readonly edges: readonly KnowledgeGraph3DEdge[];
  readonly context: Readonly<KnowledgeGraphContext>;
  readonly graphIdentity?: never;
}
type KnowledgeGraphPresentationInputAssuranceV1 = {
  readonly boundary: 'raw_json_text';
  readonly duplicateMembers: 'rejected_before_materialization';
  readonly proxyTrapFreedom: 'not_applicable';
} | {
  readonly boundary: 'materialized_javascript_value';
  readonly duplicateMembers: 'not_observable_after_materialization';
  readonly proxyTrapFreedom: 'not_established';
};
type KnowledgeGraphPresentationMappingAuthorityV1 = {
  readonly kind: 'caller_declared_visual_mapping';
  readonly scientificAuthority: 'not_established';
} | {
  readonly kind: 'corpus_visual_mapping';
  readonly presentationInvariants: 'bounded_closed_visual_records_redundant_kind_channels_and_graph_integrity';
  readonly derivationAuthentication: 'not_performed';
  readonly scientificAuthority: 'not_established';
};
/**
 * A detached, deeply frozen presentation accepted for inspection and exact-source
 * views. Public direct renderers admit only the generic profile; the canonical corpus
 * composition uses package-internal renderers. The TypeScript brand is documentation;
 * a module-private WeakSet is the runtime authority, so an object literal or serialized
 * copy cannot forge this value.
 */
interface PreparedKnowledgeGraphPresentationBaseV1 extends PreparedKnowledgeGraphNominalBrand {
  readonly contract: typeof PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1;
  readonly graphIdentity: string;
  readonly nodes: readonly Readonly<KnowledgeGraph3DNode>[];
  readonly edges: readonly Readonly<KnowledgeGraph3DEdge>[];
  readonly budget: Readonly<KnowledgeGraphPresentationBudgetReceiptV1>;
  readonly inputAssurance: Readonly<KnowledgeGraphPresentationInputAssuranceV1>;
}
/** Profile, context, and authority are one discriminated unit. */
type PreparedKnowledgeGraphPresentationV1 = PreparedKnowledgeGraphPresentationBaseV1 & ({
  readonly profile: 'generic_visual';
  readonly context?: never;
  readonly mappingAuthority: Readonly<Extract<KnowledgeGraphPresentationMappingAuthorityV1, {
    readonly kind: 'caller_declared_visual_mapping';
  }>>;
} | {
  readonly profile: 'corpus_entity';
  readonly context: Readonly<KnowledgeGraphContext>;
  readonly mappingAuthority: Readonly<Extract<KnowledgeGraphPresentationMappingAuthorityV1, {
    readonly kind: 'corpus_visual_mapping';
  }>>;
});
type PreparedGenericKnowledgeGraphPresentationV1 = Extract<PreparedKnowledgeGraphPresentationV1, {
  readonly profile: 'generic_visual';
}>;
type PreparedCorpusKnowledgeGraphPresentationV1 = Extract<PreparedKnowledgeGraphPresentationV1, {
  readonly profile: 'corpus_entity';
}>;
interface KnowledgeGraphViewPolicyV1 {
  /** Omission means all source node kinds; an empty array intentionally means none. */
  readonly nodeKinds?: readonly string[];
  /** Omission means all source edge kinds; an empty array intentionally means none. */
  readonly edgeKinds?: readonly string[];
}
interface PreparedKnowledgeGraphViewV1 extends PreparedKnowledgeGraphViewNominalBrand {
  readonly contract: typeof PREPARED_KNOWLEDGE_GRAPH_VIEW_V1;
  readonly graphIdentity: string;
  readonly policy: Readonly<{
    readonly nodeKinds: 'all' | readonly string[];
    readonly edgeKinds: 'all' | readonly string[];
  }>;
  /** Frozen arrays reuse the exact source token's frozen record objects. */
  readonly nodes: readonly Readonly<KnowledgeGraph3DNode>[];
  readonly edges: readonly Readonly<KnowledgeGraph3DEdge>[];
  readonly counts: Readonly<{
    readonly sourceNodes: number;
    readonly sourceEdges: number;
    readonly visibleNodes: number;
    readonly visibleEdges: number;
    readonly edgeKindFilteredEdges: number;
    readonly endpointPrunedEdges: number;
  }>;
}
/** Strict-parser diagnostics are retained without flattening them into prose. */
declare class KnowledgeGraphPresentationJsonError extends TypeError {
  readonly diagnostics: readonly CortexelError[];
  constructor(diagnostics: readonly CortexelError[]);
}
declare function prepareKnowledgeGraphPresentation(input: KnowledgeGraphPresentationInputV1): PreparedGenericKnowledgeGraphPresentationV1;
/** Package-shared corpus mint called by the legacy corpus visual mapper. */
declare function prepareCorpusKnowledgeGraphPresentation(input: CorpusKnowledgeGraphPresentationInputV1): PreparedCorpusKnowledgeGraphPresentationV1;
/**
 * Strong raw-text boundary: duplicate members, excessive depth/materialization,
 * malformed Unicode, and oversized input are rejected before ordinary objects
 * reach the descriptor-based preparer.
 */
declare function parseKnowledgeGraphPresentationJson(text: string): PreparedGenericKnowledgeGraphPresentationV1;
declare function isPreparedKnowledgeGraphPresentation(value: unknown): value is PreparedKnowledgeGraphPresentationV1;
declare function assertPreparedKnowledgeGraphPresentation(value: unknown): asserts value is PreparedKnowledgeGraphPresentationV1;
declare function assertPreparedGenericKnowledgeGraphPresentation(value: unknown): asserts value is PreparedGenericKnowledgeGraphPresentationV1;
declare function assertPreparedCorpusKnowledgeGraphPresentation(value: unknown): asserts value is PreparedCorpusKnowledgeGraphPresentationV1;
/** O(1) exact-token membership check; candidate ids are ordinary bounded strings. */
declare function knowledgeGraphPresentationContainsNode(presentation: PreparedKnowledgeGraphPresentationV1, nodeId: string): boolean;
/**
 * Complete RFC 8785 serialization of the exact prepared presentation record.
 * Array order remains data. The bytes are deterministic inspection/export data,
 * not a snapshot authentication, evidence-resolution, custody, or rehydration
 * receipt; parsing them does not recreate the module-private capability.
 */
declare function serializePreparedKnowledgeGraphPresentation(value: unknown): string;
/**
 * Prepare a deterministic view over an exact source capability. Filters are
 * sets: duplicates and unknown kinds are rejected, stored arrays are sorted,
 * omission means all, and [] intentionally means none. No scientific record is
 * copied or minted; visible arrays reuse exact frozen source record references.
 */
declare function prepareKnowledgeGraphView(source: PreparedKnowledgeGraphPresentationV1, policy?: KnowledgeGraphViewPolicyV1): PreparedKnowledgeGraphViewV1;
declare function isPreparedKnowledgeGraphView(value: unknown): value is PreparedKnowledgeGraphViewV1;
/** O(1) brand and exact-source binding check; no candidate property is read. */
declare function assertPreparedKnowledgeGraphView(value: unknown, source: PreparedKnowledgeGraphPresentationV1): asserts value is PreparedKnowledgeGraphViewV1;
declare function knowledgeGraphViewContainsNode(view: PreparedKnowledgeGraphViewV1, source: PreparedKnowledgeGraphPresentationV1, nodeId: string): boolean;
//#endregion
export { KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1, type KnowledgeGraphPresentationBudgetReceiptV1, KnowledgeGraphPresentationInputAssuranceV1, KnowledgeGraphPresentationInputV1, KnowledgeGraphPresentationJsonError, KnowledgeGraphPresentationMappingAuthorityV1, KnowledgeGraphViewPolicyV1, PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1, PREPARED_KNOWLEDGE_GRAPH_VIEW_V1, PreparedCorpusKnowledgeGraphPresentationV1, PreparedGenericKnowledgeGraphPresentationV1, PreparedKnowledgeGraphPresentationV1, PreparedKnowledgeGraphViewV1, assertPreparedCorpusKnowledgeGraphPresentation, assertPreparedGenericKnowledgeGraphPresentation, assertPreparedKnowledgeGraphPresentation, assertPreparedKnowledgeGraphView, isPreparedKnowledgeGraphPresentation, isPreparedKnowledgeGraphView, knowledgeGraphPresentationContainsNode, knowledgeGraphViewContainsNode, parseKnowledgeGraphPresentationJson, prepareCorpusKnowledgeGraphPresentation, prepareKnowledgeGraphPresentation, prepareKnowledgeGraphView, serializePreparedKnowledgeGraphPresentation };
