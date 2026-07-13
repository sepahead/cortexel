import * as react from 'react';
import * as THREE from 'three';
import { R as ReadonlySemanticPalette } from '../colormaps-CZ6XejJa.js';
import { K as KnowledgeGraph3DParams } from '../params-C6ubJU-Q.js';
import 'zod';

type KnowledgeGraphNodeKind = 'paper' | 'model' | 'family';
type KnowledgeGraphEdgeKind = 'cites' | 'same_as' | 'variant_of' | 'instantiates' | 'belongs_to_family';
type ParamNode = KnowledgeGraph3DParams['nodes'][number];
type KnowledgeGraphAttributes = ParamNode['attributes'];
type KnowledgeGraphEpistemic = ParamNode['epistemic'];
type KnowledgeGraphEvidenceRef = ParamNode['evidence'][number];
type KnowledgeGraphUncalibratedScore = NonNullable<ParamNode['uncalibrated_score']>;
declare const MAX_GRAPH_QUERY_LENGTH = 500;
declare const DEFAULT_GRAPH_NODE_RADIUS = 4;
/** Collision radii far above the 34-unit link distance create pathological
 * synchronous force work without adding useful visual resolution. */
declare const MAX_GRAPH_NODE_RADIUS = 64;
/** Browser-interactive budget, kept in parity with the agent params contract. */
declare const MAX_KNOWLEDGE_GRAPH_SCENE_NODES = 1000;
declare const MAX_KNOWLEDGE_GRAPH_SCENE_EDGES = 4000;
/** Four quadratic-curve chords keep separately identified relationships legible
 * without turning the 4,000-edge browser budget into an excessive vertex count. */
declare const GRAPH_EDGE_CURVE_SEGMENTS = 4;
declare const GRAPH_EDGE_LANE_SPACING = 6;
/** Evidence graphs may carry several independent assertions for one entity pair,
 * but an unbounded bundle is neither readable nor cheap to route interactively. */
declare const MAX_GRAPH_PARALLEL_EDGES = 9;
declare const MAX_GRAPH_EDGE_LANE_OFFSET: number;
declare const CORPUS_GRAPH_RADIUS_MEANING = "Schematic sqrt(rendered relationship degree) scaling; not quantitative evidence.";
declare function assertKnowledgeGraphBudget(nodeCount: number, edgeCount: number): void;
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
    label?: string;
    attributes?: Readonly<KnowledgeGraphAttributes>;
    epistemic?: Readonly<KnowledgeGraphEpistemic>;
    evidence?: readonly KnowledgeGraphEvidenceRef[];
    uncalibrated_score?: Readonly<KnowledgeGraphUncalibratedScore>;
}
/** Direct React entrypoints must not silently discard scientific relationships.
 * Identified edges are distinct assertions and therefore deduplicate by id;
 * legacy id-less edges retain the historical source/target/kind identity. */
declare function assertRenderableGraphEdges(nodes: readonly {
    id: string;
}[], edges: readonly GraphEdgeIdentity[]): void;
/** Tiny synchronous refinement used only for reduced motion. Dense maximum
 * graphs get two ticks so mounting does not become a long main-thread task. */
declare function reducedMotionLayoutTickBudget(nodeCount: number, edgeCount: number): number;
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
 * evidence-grade edge metadata reveals both incident nodes; WebGL and the DOM
 * companion call this same pure helper. */
declare function graphQueryMatchIds(nodes: readonly GraphSearchNode[], normalizedQuery: string, edges?: readonly GraphEdgeIdentity[]): ReadonlySet<string>;
/** Query visibility for an edge: a blank query keeps the complete graph, while
 * an active query retains relationships incident to at least one matching node. */
declare function graphEdgeMatchesQuery(source: string, target: string, matchingNodeIds: ReadonlySet<string>, normalizedQuery: string): boolean;
declare const GRAPH_LAYOUT_TICK_SECONDS: number;
declare const MAX_GRAPH_LAYOUT_TICKS_PER_FRAME = 2;
interface GraphLayoutClockResult {
    ticks: number;
    remainderSeconds: number;
}
/** Advance a fixed-60-Hz force-layout clock without accumulating an unbounded
 * backlog after a suspended tab. At 30+ FPS this makes wall-clock settling
 * independent of display refresh rate while capping frame work at two ticks.
 * Mutates and returns `out`, allowing useFrame callers to reuse one result. */
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
/** Undirected neighbor adjacency over the VALID edges only (dangling endpoints
 *  never leak a non-node id into a node's neighbor set). */
declare function buildAdjacency(ids: ReadonlySet<string>, edges: readonly {
    source: string;
    target: string;
}[]): Map<string, Set<string>>;
/** Particle instance count for `flowEdgeCount` flow edges, capped so a dense
 *  graph never blows the instanced particle buffer. Never negative. */
declare function flowParticleCount(flowEdgeCount: number, perEdge: number, max: number): number;
/** Order-sensitive content signature of a graph. Two content-equal nodes/edges
 *  arrays produce the SAME string even when their identities differ, so the
 *  scene keys its simulation memo on this instead of array identity — a host
 *  that rebuilds the arrays every render (the common React pattern) never
 *  restarts a settled layout. Node `id`/`radius` and the FULL edge content are
 *  covered, including stable edge ids (they feed the memoized sim/edge snapshots);
 *  node color/label are
 *  deliberately excluded — they restyle live without a layout restart. */
declare function graphSignature(nodes: readonly {
    id: string;
    radius?: number;
}[], edges: readonly {
    id?: string;
    source: string;
    target: string;
    color?: string;
    kind?: string;
    directed?: boolean;
    particles?: boolean;
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
interface MapCorpusGraphOptions {
    /** Sphere radius for a degree-0 node (world units). Default 4. */
    baseRadius?: number;
    /** Extra radius per unit of sqrt(degree), capped by `maxRadiusBump`. Default 1.4. */
    degreeScale?: number;
    /** Max extra radius from degree scaling. Default 8. */
    maxRadiusBump?: number;
    /** Override node colors per kind (defaults derive from the palette). */
    nodeColors?: Partial<Record<KnowledgeGraphNodeKind, string>>;
    /** Override edge styles per kind (defaults derive from the palette). */
    edgeStyles?: Partial<Record<KnowledgeGraphEdgeKind, EdgeStyle>>;
}
interface MappedCorpusGraph {
    context: KnowledgeGraphContext;
    nodes: KnowledgeGraph3DNode[];
    edges: KnowledgeGraph3DEdge[];
}
interface KnowledgeGraphContext {
    graph_id: string;
    graph_source: string;
    graph_snapshot_id: string;
    graph_scope: string;
    generated_at: string;
}
/**
 * Map validated `corpus.knowledge_graph` params → KnowledgeGraph3DScene props.
 * Node color derives from kind; radius grows gently with degree so a highly-cited
 * paper reads as a hub. Edge color/direction/particles derive from kind (only
 * `cites` flows particles). The strict gate rejects dangling/self-loop edges;
 * this mapper defensively drops them for legacy programmatic callers so its
 * degree/radius calculation still matches the rendered edge set.
 * The honesty boundary (same_as/variant_of are advisory, not certified sameness)
 * is enforced upstream at the skill gate, not here.
 */
declare function mapCorpusKnowledgeGraph(params: KnowledgeGraph3DParams, palette: ReadonlySemanticPalette, opts?: MapCorpusGraphOptions): MappedCorpusGraph;

declare const DEFAULT_A11Y_NODE_PAGE_SIZE = 100;
declare const MAX_A11Y_NODE_PAGE_SIZE = 200;
interface KnowledgeGraphA11yListProps {
    nodes: readonly KnowledgeGraph3DNode[];
    edges: readonly KnowledgeGraph3DEdge[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    query?: string;
    className?: string;
    label?: string;
    /** Node rows rendered at once. Relationship detail has its own pager. */
    nodePageSize?: number;
}
interface KnowledgeGraphLegendProps {
    nodes: readonly KnowledgeGraph3DNode[];
    edges: readonly KnowledgeGraph3DEdge[];
    /** Immutable corpus/snapshot context returned by mapCorpusKnowledgeGraph. */
    context?: Readonly<KnowledgeGraphContext>;
    className?: string;
    label?: string;
}
declare function KnowledgeGraphA11yList({ nodes, edges, selectedId, onSelect, query, className, label, nodePageSize, }: KnowledgeGraphA11yListProps): react.JSX.Element;
/** Canvas-external decoding companion for interactive views and DOM-inclusive
 * still captures. Text redundantly carries kind, color, direction, and count. */
declare function KnowledgeGraphLegend({ nodes, edges, context, className, label, }: KnowledgeGraphLegendProps): react.JSX.Element;

interface KnowledgeGraph3DNode {
    id: string;
    label: string;
    detail?: string;
    attributes?: Readonly<KnowledgeGraphAttributes>;
    epistemic?: Readonly<KnowledgeGraphEpistemic>;
    evidence?: readonly KnowledgeGraphEvidenceRef[];
    uncalibrated_score?: Readonly<KnowledgeGraphUncalibratedScore>;
    color: string;
    radius: number;
    /** Human-readable semantics for radius. Omitted means caller-defined visual size. */
    radiusMeaning?: string;
    kind: string;
}
interface KnowledgeGraph3DEdge {
    /** Stable assertion identity. Distinct ids may share endpoints and kind. */
    id?: string;
    label?: string;
    attributes?: Readonly<KnowledgeGraphAttributes>;
    epistemic?: Readonly<KnowledgeGraphEpistemic>;
    evidence?: readonly KnowledgeGraphEvidenceRef[];
    uncalibrated_score?: Readonly<KnowledgeGraphUncalibratedScore>;
    source: string;
    target: string;
    color: string;
    /** Directed edges receive a persistent arrowhead (including reduced motion). */
    directed?: boolean;
    kind: string;
    /** Animate glowing particles flowing source→target (e.g. citations). */
    particles?: boolean;
}
/** Minimal OrbitControls surface the scene needs for auto-frame + fly-to. The
 *  controls themselves stay host-side (Design Law #5); the host passes a ref. */
interface ControlsHandle {
    target: THREE.Vector3;
    update: () => void;
    /** Optional EventDispatcher surface (OrbitControls has it). When present, the
     *  scene cancels its own camera moves on 'start' (user grab: drag/zoom
     *  begin) — the user's hand always wins over auto-frame and fly-to. */
    addEventListener?(type: 'start', listener: () => void): void;
    removeEventListener?(type: 'start', listener: () => void): void;
}
interface KnowledgeGraph3DSceneProps {
    nodes: readonly KnowledgeGraph3DNode[];
    edges: readonly KnowledgeGraph3DEdge[];
    selectedId: string | null;
    query: string;
    onSelect: (id: string) => void;
    hoverId: string | null;
    onHover: (id: string | null) => void;
    /** Host-owned OrbitControls ref, used for camera auto-frame + fly-to. When
     *  absent, the scene renders and lays out normally but skips camera moves. */
    controlsRef?: React.RefObject<ControlsHandle | null>;
    /** Camera mutation is opt-in: the host owns the frame. Requires controlsRef. */
    autoFrame?: boolean;
    /** Move the host controls target to selected nodes. Requires controlsRef. */
    flyToSelection?: boolean;
    /** Focus-label color (default a light slate). Not host-palette-hardcoded. */
    labelColor?: string;
    /** Citation-flow particle color (a single visual language for flow). */
    particleColor?: string;
    /** Host-detected `prefers-reduced-motion` (same contract as the Expandable*
     *  scenes): the layout appears pre-settled instead of swirling into place,
     *  flow particles hold still, and the fly-to snaps instead of easing. */
    reducedMotion?: boolean;
}
declare function KnowledgeGraph3DScene({ nodes, edges, selectedId, query, onSelect, hoverId, onHover, controlsRef, autoFrame, flyToSelection, labelColor, particleColor, reducedMotion, }: KnowledgeGraph3DSceneProps): react.JSX.Element;

export { CORPUS_GRAPH_RADIUS_MEANING, type ControlsHandle, DEFAULT_A11Y_NODE_PAGE_SIZE, DEFAULT_GRAPH_NODE_RADIUS, GRAPH_EDGE_CURVE_SEGMENTS, GRAPH_EDGE_LANE_SPACING, GRAPH_LAYOUT_TICK_SECONDS, type GraphEdgeIdentity, type GraphEdgeLane, type GraphLayoutClockResult, type GraphPoint3, type GraphSearchNode, type GraphTopologyLink, type KnowledgeGraph3DEdge, type KnowledgeGraph3DNode, KnowledgeGraph3DScene, type KnowledgeGraph3DSceneProps, KnowledgeGraphA11yList, type KnowledgeGraphA11yListProps, type KnowledgeGraphAttributes, type KnowledgeGraphContext, type KnowledgeGraphEdgeKind, type KnowledgeGraphEpistemic, type KnowledgeGraphEvidenceRef, KnowledgeGraphLegend, type KnowledgeGraphLegendProps, type KnowledgeGraphNodeKind, type KnowledgeGraphUncalibratedScore, MAX_A11Y_NODE_PAGE_SIZE, MAX_GRAPH_EDGE_LANE_OFFSET, MAX_GRAPH_LAYOUT_TICKS_PER_FRAME, MAX_GRAPH_NODE_RADIUS, MAX_GRAPH_PARALLEL_EDGES, MAX_GRAPH_QUERY_LENGTH, MAX_KNOWLEDGE_GRAPH_SCENE_EDGES, MAX_KNOWLEDGE_GRAPH_SCENE_NODES, type MapCorpusGraphOptions, type MappedCorpusGraph, advanceGraphLayoutClock, advanceGraphLayoutClockInto, assertKnowledgeGraphBudget, assertRenderableGraphEdges, assertUniqueGraphNodeIds, assignGraphEdgeLanes, buildAdjacency, defaultEdgeStyles, defaultNodeColors, filterGraphEdges, flowParticleCount, graphEdgeControlPointInto, graphEdgeCurvePointInto, graphEdgeMatchesQuery, graphQueryMatchIds, graphSignature, mapCorpusKnowledgeGraph, matchesGraphQuery, normalizeGraphNodeRadius, normalizeGraphQuery, reducedMotionLayoutTickBudget, uniqueGraphTopologyLinks };
