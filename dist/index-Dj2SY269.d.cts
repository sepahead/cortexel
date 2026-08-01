import { e as KnowledgeGraphAttributes, h as KnowledgeGraphEpistemic, i as KnowledgeGraphEvidenceRef, p as KnowledgeGraphUncalibratedScore, f as KnowledgeGraphContext, g as KnowledgeGraphEdgeKind, j as KnowledgeGraphNodeKind, t as PreparedKnowledgeGraphPresentationV1, P as PreparedKnowledgeGraphViewV1, K as KnowledgeGraphViewPolicyV1 } from './knowledgeGraphPresentation.internal-BjbxfSCn.cjs';
import { R as ReadonlySemanticPalette, V as VizSpec } from './vizSpec-Bfwh_kq9.cjs';

declare const MAX_GRAPH_QUERY_LENGTH = 500;
declare const DEFAULT_GRAPH_NODE_RADIUS = 4;
/** Collision radii far above the 34-unit link distance create pathological
 * synchronous force work without adding useful visual resolution. */
declare const MAX_GRAPH_NODE_RADIUS = 64;
/** Accepted presentation/inspection/DOM bounds, in parity with the params gate. */
declare const MAX_KNOWLEDGE_GRAPH_PRESENTATION_NODES: 1000;
declare const MAX_KNOWLEDGE_GRAPH_PRESENTATION_EDGES: 4000;
/**
 * Conservative main-thread d3-force ceilings. The exact repository/package-smoke
 * runtime uses d3 3.0.6, whose forces build fresh spatial indexes every tick.
 * The supported peer range has no transitive allocation/performance certificate;
 * these bounds make no browser-, device-, frame-rate-, or latency guarantee.
 */
declare const MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES: 250;
declare const MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES: 1000;
/** Twelve quadratic chords retain bounded geometry while admitting four closed,
 * color-independent relationship stroke patterns within the live-force ceiling. */
declare const GRAPH_EDGE_CURVE_SEGMENTS = 12;
declare const GRAPH_EDGE_LANE_SPACING = 6;
/** Evidence graphs may carry several independent assertions for one entity pair,
 * but an unbounded bundle is neither readable nor cheap to route interactively. */
declare const MAX_GRAPH_PARALLEL_EDGES: 9;
declare const MAX_GRAPH_EDGE_LANE_OFFSET: number;
/** Exact disclosure for the radius mapping actually returned to the scene. */
declare function corpusGraphRadiusMeaning(baseRadius: number, degreeScale: number, maxRadiusBump: number): string;
declare const CORPUS_GRAPH_RADIUS_MEANING: string;
declare function assertKnowledgeGraphPresentationBudget(nodeCount: number, edgeCount: number): void;
declare function isKnowledgeGraphLiveForceWithinBudget(nodeCount: number, edgeCount: number): boolean;
declare function assertKnowledgeGraphLiveForceBudget(nodeCount: number, edgeCount: number): void;
type KnowledgeGraphLiveForceAvailabilityV1 = Readonly<{
    readonly status: 'available' | 'unavailable_resource_limit';
    readonly nodeCount: number;
    readonly edgeCount: number;
    readonly maxNodes: number;
    readonly maxEdges: number;
    readonly exceeded: readonly ('nodes' | 'edges')[];
}>;
/** Exact active-view admission record for the allocating main-thread solver. */
declare function knowledgeGraphLiveForceAvailability(nodeCount: number, edgeCount: number): KnowledgeGraphLiveForceAvailabilityV1;
/** Validate the caller-declared namespace used to remount stateful graph surfaces.
 * The value is a cache boundary only; validation does not authenticate it. */
declare function assertKnowledgeGraphIdentity(graphIdentity: unknown): asserts graphIdentity is string;
/** Direct React entrypoints share the strict skill contract's identity invariant:
 * duplicate ids make edge endpoints, selection, and accessible controls ambiguous,
 * so they fail closed instead of choosing an arbitrary occurrence. */
declare function assertUniqueGraphNodeIds(nodes: readonly {
    id: string;
}[]): void;
interface GraphEdgeIdentity {
    id?: string;
    source: string;
    target: string;
    kind?: string;
    directed?: boolean;
    particles?: boolean;
    label?: string;
    attributes?: Readonly<KnowledgeGraphAttributes>;
    epistemic?: Readonly<KnowledgeGraphEpistemic>;
    evidence?: readonly KnowledgeGraphEvidenceRef[];
    uncalibrated_score?: Readonly<KnowledgeGraphUncalibratedScore>;
}
/** Direct React entrypoints must not silently discard scientific relationships.
 * Identified edges are distinct assertions and therefore deduplicate by id;
 * legacy id-less edges use source/target/kind plus their effective direction.
 * Undirected identity is endpoint-order invariant; directed identity is not. */
declare function assertRenderableGraphEdges(nodes: readonly {
    id: string;
}[], edges: readonly GraphEdgeIdentity[]): void;
/** At most one synchronous allocating refinement tick for reduced motion. */
declare function reducedMotionLayoutTickBudget(nodeCount: number, edgeCount: number): number;
/** Frame-rate-independent exponential damping for a host-owned camera target.
 * Invalid or non-positive frame intervals make no movement; reduced motion snaps. */
declare function graphCameraTargetDamping(deltaSeconds: number, reducedMotion: boolean): number;
declare function normalizeGraphQuery(query: string): string;
/** Shared visual/DOM search semantics. Pass a query normalized with
 * `normalizeGraphQuery` so both surfaces reveal and dim the same nodes.
 *
 * The three-argument overload preserves the original label/kind API for direct
 * consumers. Cortexel's graph surfaces use the four-argument form so stable node
 * ids are searchable even when the human-facing label omits them. */
declare function matchesGraphQuery(label: string, kind: string, normalizedQuery: string): boolean;
declare function matchesGraphQuery(id: string, label: string, kind: string, normalizedQuery: string): boolean;
interface GraphSearchNode {
    id: string;
    label: string;
    kind: string;
    radius?: number;
    radiusMeaning?: string;
    detail?: string;
    attributes?: Readonly<Record<string, unknown>>;
    epistemic?: unknown;
    evidence?: readonly unknown[];
    uncalibrated_score?: unknown;
}
/** Compute the exact node-id set used by query-aware scene emphasis. Matching
 * evidence-shaped edge metadata reveals both incident nodes; WebGL and the DOM
 * companion call this same pure helper. */
declare function graphQueryMatchIds(nodes: readonly GraphSearchNode[], normalizedQuery: string, edges?: readonly GraphEdgeIdentity[]): ReadonlySet<string>;
/** Query visibility for an edge: a blank query keeps the complete graph, while
 * an active query retains relationships incident to at least one matching node. */
declare function graphEdgeMatchesQuery(source: string, target: string, matchingNodeIds: ReadonlySet<string>, normalizedQuery: string): boolean;
declare const GRAPH_LAYOUT_TICK_SECONDS: number;
declare const MAX_GRAPH_LAYOUT_TICKS_PER_FRAME = 1;
interface GraphLayoutClockResult {
    ticks: number;
    remainderSeconds: number;
}
/** Advance a force-layout clock at no more than 60 simulation ticks per second
 * and one tick per rendered frame, without retaining a suspended-tab backlog.
 * Below 60 FPS the layout deliberately settles more slowly instead of doubling
 * the allocation-heavy d3 work in a frame. Mutates and returns `out`. */
declare function advanceGraphLayoutClockInto(accumulatorSeconds: number, deltaSeconds: number, out: GraphLayoutClockResult): GraphLayoutClockResult;
/** Allocating compatibility wrapper for callers outside the render loop. */
declare function advanceGraphLayoutClock(accumulatorSeconds: number, deltaSeconds: number): GraphLayoutClockResult;
declare function normalizeGraphNodeRadius(radius: number): number;
/** The set of edges this scene can actually render: both endpoints resolve to a
 *  node id in `ids`, AND it is not a self-loop (a self-loop draws a zero-length,
 *  invisible segment and stacks its particles at one point). Every scene path
 *  (layout links, adjacency, endpoints, particles, emphasis) and the mapper agree
 *  on this ONE definition, so their element counts can never disagree. */
declare function filterGraphEdges<E extends GraphEdgeIdentity>(ids: ReadonlySet<string>, edges: readonly E[]): E[];
interface GraphEdgeLane<E extends GraphEdgeIdentity = GraphEdgeIdentity> {
    edge: E;
    edgeIndex: number;
    /** Dimensionless, centered offset: 0 for one edge, ±0.5 for two, −1/0/1 for three. */
    laneOffset: number;
    bundleSize: number;
    /** Converts the edge's source→target vector to the pair's canonical id order. */
    canonicalDirectionSign: 1 | -1;
}
/** Assign deterministic, order-independent lanes to every relationship sharing
 * an unordered endpoint pair. Stable edge ids are the primary assertion key;
 * the legacy semantic tuple remains the fallback for id-less direct callers. */
declare function assignGraphEdgeLanes<E extends GraphEdgeIdentity>(edges: readonly E[]): GraphEdgeLane<E>[];
interface GraphTopologyLink {
    source: string;
    target: string;
}
/** The force layout is schematic topology, not an evidence counter. Multiple
 * assertions on one node pair therefore render separately but contribute one
 * canonical, undirected spring rather than silently multiplying attraction. */
declare function uniqueGraphTopologyLinks(edges: readonly {
    source: string;
    target: string;
}[]): GraphTopologyLink[];
interface GraphPoint3 {
    x: number;
    y: number;
    z: number;
}
/** Write the shared quadratic control point for one routed edge. The Frisvad
 * tangent basis is deterministic in world space and independent of the camera,
 * so orbiting, reduced motion, and still capture preserve lane identity. */
declare function graphEdgeControlPointInto<T extends GraphPoint3>(source: Readonly<GraphPoint3>, target: Readonly<GraphPoint3>, lane: Pick<GraphEdgeLane, 'laneOffset' | 'canonicalDirectionSign'>, out: T): T;
/** Allocation-free quadratic Bézier evaluation shared by line chords and flow
 * particles. `t` is clamped so hostile animation deltas cannot extrapolate. */
declare function graphEdgeCurvePointInto<T extends GraphPoint3>(source: Readonly<GraphPoint3>, control: Readonly<GraphPoint3>, target: Readonly<GraphPoint3>, t: number, out: T): T;
declare const GRAPH_EDGE_TARGET_BOUNDARY_SOLVE_ITERATIONS = 18;
/**
 * Find the nearest target-side point where a routed quadratic enters the target
 * glyph's conservative radial boundary, then return its unit forward tangent.
 * A fixed chord scan brackets the nearest crossing and fixed bisection bounds
 * work. Returns false when the complete routed curve stays inside the glyph.
 */
declare function graphEdgeTargetBoundaryInto<P extends GraphPoint3, D extends GraphPoint3>(source: Readonly<GraphPoint3>, control: Readonly<GraphPoint3>, target: Readonly<GraphPoint3>, targetRadius: number, pointOut: P, directionOut: D): boolean;
/** Undirected neighbor adjacency over the VALID edges only (dangling endpoints
 *  never leak a non-node id into a node's neighbor set). */
declare function buildAdjacency(ids: ReadonlySet<string>, edges: readonly {
    source: string;
    target: string;
}[]): Map<string, Set<string>>;
/** Particle instance count for `flowEdgeCount` flow edges, capped so a dense
 *  graph never blows the instanced particle buffer. Never negative. */
declare function flowParticleCount(flowEdgeCount: number, perEdge: number, max: number): number;
/** Order-sensitive renderer-state signature of a graph. Two renderer-equivalent
 *  nodes/edges
 *  arrays produce the SAME string even when their identities differ, so the
 *  scene keys its simulation memo on this instead of array identity — a host
 *  that rebuilds the arrays every render (the common React pattern) never
 *  restarts a settled layout. Node `id`/`radius` and every edge field consumed by
 *  memoized renderer state are covered, including stable edge ids. Node
 *  color/label and evidence metadata are deliberately excluded because they
 *  restyle or describe live without changing that state. */
declare function graphSignature(nodes: readonly {
    id: string;
    radius?: number;
    nodeGlyph?: string;
}[], edges: readonly {
    id?: string;
    source: string;
    target: string;
    color?: string;
    kind?: string;
    directed?: boolean;
    particles?: boolean;
    edgeStrokePattern?: string;
}[]): string;
/** Default node color per kind, sampled from the active semantic palette. */
declare function defaultNodeColors(palette: ReadonlySemanticPalette): Record<KnowledgeGraphNodeKind, string>;
interface EdgeStyle {
    color: string;
    directed: boolean;
    particles: boolean;
}
/** Default edge styling per kind. Only `cites` carries flow particles (citation
 *  flow); `same_as` is undirected (symmetric advisory identity). */
declare function defaultEdgeStyles(palette: ReadonlySemanticPalette): Record<KnowledgeGraphEdgeKind, EdgeStyle>;
/** Collision-free encoding of the caller-declared graph context for layout/cache
 * continuity. Filtering one declared snapshot keeps this value. This is neither
 * a graph-content digest nor independent authentication of any context field. */
declare function corpusGraphInstanceIdentity(context: KnowledgeGraphContext): string;

/**
 * Peer-free bind-and-prepare boundary for the experimental legacy corpus graph.
 * Agents and hosts should use this instead of independently pairing a strict
 * caption with a separately mapped presentation.
 */

interface KnowledgeGraphFigureHostPolicyV1 {
    readonly presentation: PreparedKnowledgeGraphPresentationV1;
    /** Exact source-bound view; undefined means the complete presentation. */
    readonly view: PreparedKnowledgeGraphViewV1 | undefined;
    /** Authority of the complete VizSpec input boundary, before strict validation. */
    readonly sourceInputAssurance: KnowledgeGraphFigureSourceInputAssuranceV1;
    readonly palette: ReadonlySemanticPalette;
    readonly themeMode: VizSpec['themeMode'];
    /** Exact background required by the scene's contrast and blending policy. */
    readonly backgroundColor: string;
    readonly camera: VizSpec['camera'];
    /** Exact active-view admission result for the main-thread d3 force solver. */
    readonly liveForceAvailability: KnowledgeGraphLiveForceAvailabilityV1;
}
interface KnowledgeGraphFigurePreparationErrorV1 {
    readonly code: 'input_boundary_rejected' | 'raw_json_rejected' | 'strict_gate_rejected' | 'wrong_skill' | 'unsupported_mode' | 'missing_bound_caption' | 'presentation_preparation_failed' | 'view_preparation_failed';
    readonly path: string;
    readonly message: string;
    readonly gateCode?: string;
}
type KnowledgeGraphFigureSourceInputAssuranceV1 = Readonly<{
    readonly boundary: 'raw_json_text';
    readonly duplicateMembers: 'rejected_before_materialization';
}> | Readonly<{
    readonly boundary: 'materialized_javascript_value';
    readonly duplicateMembers: 'not_observable_after_materialization';
}>;
interface AcceptedKnowledgeGraphFigureSourceV1 {
    readonly caption: string;
    readonly sourceInputAssurance: KnowledgeGraphFigureSourceInputAssuranceV1;
    readonly presentation: PreparedKnowledgeGraphPresentationV1 & {
        readonly profile: 'corpus_entity';
    };
}
type PrepareCorpusKnowledgeGraphFigureResultV1 = {
    readonly ok: true;
    readonly caption: string;
    readonly sourceInputAssurance: KnowledgeGraphFigureSourceInputAssuranceV1;
    readonly presentation: PreparedKnowledgeGraphPresentationV1 & {
        readonly profile: 'corpus_entity';
    };
    readonly view: PreparedKnowledgeGraphViewV1 | undefined;
    readonly hostPolicy: Readonly<KnowledgeGraphFigureHostPolicyV1>;
} | {
    readonly ok: false;
    readonly errors: readonly Readonly<KnowledgeGraphFigurePreparationErrorV1>[];
    /** Present only when source validation/mapping passed but view policy failed. */
    readonly acceptedSource?: Readonly<AcceptedKnowledgeGraphFigureSourceV1>;
};
interface PrepareCorpusKnowledgeGraphFigureOptionsV1 {
    /** Trusted host fallback used only when the validated spec has no palette hint. */
    readonly activePalette?: ReadonlySemanticPalette;
    /** Strict visual-kind policy; omission means the complete presentation. */
    readonly viewPolicy?: KnowledgeGraphViewPolicyV1;
}
/**
 * Materialized-value boundary for a complete corpus VizSpec. It runs the same
 * strict skill, mapping, caption, view, and host-policy pipeline as the raw-text
 * entry, while recording honestly that duplicate JSON members are no longer
 * observable after a host has materialized the value.
 */
declare function prepareCorpusKnowledgeGraphFigure(spec: unknown, options?: PrepareCorpusKnowledgeGraphFigureOptionsV1): PrepareCorpusKnowledgeGraphFigureResultV1;
/**
 * Strict raw-text boundary for a complete corpus VizSpec. It rejects duplicate
 * members and parser-budget violations before materialization, then runs the
 * same strict skill, mapping, caption, view, and host-policy pipeline as the
 * materialized-value entry. Ordinary rejection is returned and never thrown.
 */
declare function prepareCorpusKnowledgeGraphFigureJson(text: string, options?: PrepareCorpusKnowledgeGraphFigureOptionsV1): PrepareCorpusKnowledgeGraphFigureResultV1;

export { normalizeGraphNodeRadius as $, type AcceptedKnowledgeGraphFigureSourceV1 as A, assertRenderableGraphEdges as B, CORPUS_GRAPH_RADIUS_MEANING as C, DEFAULT_GRAPH_NODE_RADIUS as D, assertUniqueGraphNodeIds as E, assignGraphEdgeLanes as F, GRAPH_EDGE_CURVE_SEGMENTS as G, buildAdjacency as H, corpusGraphInstanceIdentity as I, corpusGraphRadiusMeaning as J, type KnowledgeGraphFigureHostPolicyV1 as K, defaultEdgeStyles as L, MAX_GRAPH_EDGE_LANE_OFFSET as M, defaultNodeColors as N, filterGraphEdges as O, type PrepareCorpusKnowledgeGraphFigureOptionsV1 as P, flowParticleCount as Q, graphCameraTargetDamping as R, graphEdgeControlPointInto as S, graphEdgeCurvePointInto as T, graphEdgeMatchesQuery as U, graphEdgeTargetBoundaryInto as V, graphQueryMatchIds as W, graphSignature as X, isKnowledgeGraphLiveForceWithinBudget as Y, knowledgeGraphLiveForceAvailability as Z, matchesGraphQuery as _, GRAPH_EDGE_LANE_SPACING as a, normalizeGraphQuery as a0, prepareCorpusKnowledgeGraphFigure as a1, prepareCorpusKnowledgeGraphFigureJson as a2, reducedMotionLayoutTickBudget as a3, uniqueGraphTopologyLinks as a4, GRAPH_EDGE_TARGET_BOUNDARY_SOLVE_ITERATIONS as b, GRAPH_LAYOUT_TICK_SECONDS as c, type GraphEdgeIdentity as d, type GraphEdgeLane as e, type GraphLayoutClockResult as f, type GraphPoint3 as g, type GraphSearchNode as h, type GraphTopologyLink as i, type KnowledgeGraphFigurePreparationErrorV1 as j, type KnowledgeGraphFigureSourceInputAssuranceV1 as k, type KnowledgeGraphLiveForceAvailabilityV1 as l, MAX_GRAPH_LAYOUT_TICKS_PER_FRAME as m, MAX_GRAPH_NODE_RADIUS as n, MAX_GRAPH_PARALLEL_EDGES as o, MAX_GRAPH_QUERY_LENGTH as p, MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES as q, MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES as r, MAX_KNOWLEDGE_GRAPH_PRESENTATION_EDGES as s, MAX_KNOWLEDGE_GRAPH_PRESENTATION_NODES as t, type PrepareCorpusKnowledgeGraphFigureResultV1 as u, advanceGraphLayoutClock as v, advanceGraphLayoutClockInto as w, assertKnowledgeGraphIdentity as x, assertKnowledgeGraphLiveForceBudget as y, assertKnowledgeGraphPresentationBudget as z };
