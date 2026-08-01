import { C as CortexelError } from './errors-DOfZeMp8.js';
import { PreparedKnowledgeGraphNominalBrand, PreparedKnowledgeGraphViewNominalBrand } from '#cortexel-knowledge-graph-presentation-brand';

/**
 * Pure data types shared by the knowledge-graph mapper, presentation authority,
 * and React surfaces. This module has no value imports and must remain a leaf: the
 * private capability runtime may not depend on React, Three, R3F, or d3 modules.
 */
type KnowledgeGraphNodeKind = 'paper' | 'model' | 'family';
type KnowledgeGraphNodeGlyph = 'sphere_outline' | 'box_shell' | 'diamond_shell';
type KnowledgeGraphEdgeKind = 'cites' | 'same_as' | 'variant_of' | 'instantiates' | 'belongs_to_family';
type KnowledgeGraphEdgeStrokePattern = 'solid' | 'long_dash' | 'short_dash' | 'dotted';
type KnowledgeGraphAttributeScalar = null | boolean | number | string;
type KnowledgeGraphAttributeValue = KnowledgeGraphAttributeScalar | readonly KnowledgeGraphAttributeScalar[];
type KnowledgeGraphAttributes = Readonly<Record<string, KnowledgeGraphAttributeValue>>;
interface KnowledgeGraphEpistemic {
    readonly status: 'derived_advisory';
    readonly advisory_only: true;
    readonly is_paper_local_evidence: false;
    readonly calibrated_posterior: false;
}
interface KnowledgeGraphEvidenceBase {
    readonly evidence_id: string;
    readonly locator?: string;
}
type KnowledgeGraphEvidenceRef = (KnowledgeGraphEvidenceBase & {
    readonly kind: 'graph_snapshot_record';
    readonly record_id: string;
}) | (KnowledgeGraphEvidenceBase & {
    readonly kind: 'graph_node';
    readonly node_id: string;
    readonly excerpt?: string;
}) | (KnowledgeGraphEvidenceBase & {
    readonly kind: 'citation';
    readonly paper_id: string;
    readonly citation_id: string;
    readonly page?: number;
    readonly excerpt?: string;
    readonly doi?: string;
}) | (KnowledgeGraphEvidenceBase & {
    readonly kind: 'external_source';
    readonly source_id: string;
    readonly excerpt?: string;
});
interface KnowledgeGraphUncalibratedScore {
    readonly kind: 'extraction_confidence' | 'citation_resolution_confidence' | 'structural_similarity' | 'behavioral_agreement' | 'retrieval_relevance';
    readonly value: number;
    readonly calibrated_posterior: false;
}
interface KnowledgeGraphContext {
    readonly graph_id: string;
    readonly graph_source: string;
    readonly graph_snapshot_id: string;
    readonly graph_scope: string;
    readonly generated_at: string;
}
interface KnowledgeGraph3DNode {
    readonly id: string;
    readonly label: string;
    readonly detail?: string;
    readonly attributes?: KnowledgeGraphAttributes;
    readonly epistemic?: KnowledgeGraphEpistemic;
    readonly evidence?: readonly KnowledgeGraphEvidenceRef[];
    readonly uncalibrated_score?: KnowledgeGraphUncalibratedScore;
    /** Exact normalized hex presentation color; not evidence. */
    readonly color: string;
    /** Positive bounded schematic radius; not quantitative evidence. */
    readonly radius: number;
    /** Human-readable radius semantics. Omission means caller-defined visual size. */
    readonly radiusMeaning?: string;
    readonly kind: string;
    /** Closed redundant visual-kind channel; defaults to an outlined sphere. */
    readonly nodeGlyph?: KnowledgeGraphNodeGlyph;
}
interface KnowledgeGraph3DEdge {
    /** Stable assertion identity. Distinct ids may share endpoints and kind. */
    readonly id?: string;
    readonly label?: string;
    readonly attributes?: KnowledgeGraphAttributes;
    readonly epistemic?: KnowledgeGraphEpistemic;
    readonly evidence?: readonly KnowledgeGraphEvidenceRef[];
    readonly uncalibrated_score?: KnowledgeGraphUncalibratedScore;
    readonly source: string;
    readonly target: string;
    /** Exact normalized hex presentation color; not evidence. */
    readonly color: string;
    /** Directed edges receive a persistent arrowhead, including under reduced motion. */
    readonly directed?: boolean;
    readonly kind: string;
    /** Visual source-to-target flow marker. */
    readonly particles?: boolean;
    /** Closed redundant relationship-kind channel; defaults to a solid stroke. */
    readonly edgeStrokePattern?: KnowledgeGraphEdgeStrokePattern;
}

interface KnowledgeGraphPresentationBudgetReceiptV1 {
    /** Input-container/value occurrences inspected and copied, counted per alias occurrence. */
    readonly retainedOccurrences: number;
    /** UTF-16 code units read from accepted caller-supplied strings. */
    readonly sourceStringCodeUnits: number;
    /** Prototype, key, and descriptor inspection operations, including revalidation. */
    readonly inspectionWork: number;
}

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

export { knowledgeGraphViewContainsNode as A, parseKnowledgeGraphPresentationJson as B, prepareKnowledgeGraphPresentation as C, prepareKnowledgeGraphView as D, serializePreparedKnowledgeGraphPresentation as E, type KnowledgeGraphAttributeScalar as F, type KnowledgeGraphAttributeValue as G, assertPreparedCorpusKnowledgeGraphPresentation as H, prepareCorpusKnowledgeGraphPresentation as I, type KnowledgeGraphViewPolicyV1 as K, type PreparedKnowledgeGraphViewV1 as P, type PreparedGenericKnowledgeGraphPresentationV1 as a, KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1 as b, type KnowledgeGraph3DEdge as c, type KnowledgeGraph3DNode as d, type KnowledgeGraphAttributes as e, type KnowledgeGraphContext as f, type KnowledgeGraphEdgeKind as g, type KnowledgeGraphEpistemic as h, type KnowledgeGraphEvidenceRef as i, type KnowledgeGraphNodeKind as j, type KnowledgeGraphPresentationBudgetReceiptV1 as k, type KnowledgeGraphPresentationInputAssuranceV1 as l, type KnowledgeGraphPresentationInputV1 as m, KnowledgeGraphPresentationJsonError as n, type KnowledgeGraphPresentationMappingAuthorityV1 as o, type KnowledgeGraphUncalibratedScore as p, PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1 as q, PREPARED_KNOWLEDGE_GRAPH_VIEW_V1 as r, type PreparedCorpusKnowledgeGraphPresentationV1 as s, type PreparedKnowledgeGraphPresentationV1 as t, assertPreparedGenericKnowledgeGraphPresentation as u, assertPreparedKnowledgeGraphPresentation as v, assertPreparedKnowledgeGraphView as w, isPreparedKnowledgeGraphPresentation as x, isPreparedKnowledgeGraphView as y, knowledgeGraphPresentationContainsNode as z };
