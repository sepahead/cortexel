import * as react from 'react';
import * as THREE from 'three';
import { R as ReadonlySemanticPalette } from '../colormaps-CZ6XejJa.js';
import { K as KnowledgeGraph3DParams } from '../params-wRfhrStj.js';
import 'zod';

type KnowledgeGraphNodeKind = 'paper' | 'model' | 'family';
type KnowledgeGraphEdgeKind = 'cites' | 'same_as' | 'variant_of' | 'instantiates' | 'belongs_to_family';
declare const MAX_GRAPH_QUERY_LENGTH = 500;
declare const DEFAULT_GRAPH_NODE_RADIUS = 4;
/** Collision radii far above the 34-unit link distance create pathological
 * synchronous force work without adding useful visual resolution. */
declare const MAX_GRAPH_NODE_RADIUS = 64;
/** Browser-interactive budget, kept in parity with the agent params contract. */
declare const MAX_KNOWLEDGE_GRAPH_SCENE_NODES = 1000;
declare const MAX_KNOWLEDGE_GRAPH_SCENE_EDGES = 4000;
declare function assertKnowledgeGraphBudget(nodeCount: number, edgeCount: number): void;
/** Tiny synchronous refinement used only for reduced motion. Dense maximum
 * graphs get two ticks so mounting does not become a long main-thread task. */
declare function reducedMotionLayoutTickBudget(nodeCount: number, edgeCount: number): number;
declare function normalizeGraphQuery(query: string): string;
/** Shared visual/DOM search semantics. Pass a query normalized with
 * `normalizeGraphQuery` so both surfaces reveal and dim the same nodes. */
declare function matchesGraphQuery(label: string, kind: string, normalizedQuery: string): boolean;
declare const GRAPH_LAYOUT_TICK_SECONDS: number;
declare const MAX_GRAPH_LAYOUT_TICKS_PER_FRAME = 2;
/** Advance a fixed-60-Hz force-layout clock without accumulating an unbounded
 * backlog after a suspended tab. At 30+ FPS this makes wall-clock settling
 * independent of display refresh rate while capping frame work at two ticks. */
declare function advanceGraphLayoutClock(accumulatorSeconds: number, deltaSeconds: number): {
    ticks: number;
    remainderSeconds: number;
};
declare function normalizeGraphNodeRadius(radius: number): number;
/** The set of edges this scene can actually render: both endpoints resolve to a
 *  node id in `ids`, AND it is not a self-loop (a self-loop draws a zero-length,
 *  invisible segment and stacks its particles at one point). Every scene path
 *  (layout links, adjacency, endpoints, particles, emphasis) and the mapper agree
 *  on this ONE definition, so their element counts can never disagree. */
declare function filterGraphEdges<E extends {
    source: string;
    target: string;
}>(ids: ReadonlySet<string>, edges: readonly E[]): E[];
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
 *  covered (they feed the memoized sim/edge snapshots); node color/label are
 *  deliberately excluded — they restyle live without a layout restart. */
declare function graphSignature(nodes: readonly {
    id: string;
    radius?: number;
}[], edges: readonly {
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
    nodes: KnowledgeGraph3DNode[];
    edges: KnowledgeGraph3DEdge[];
}
/**
 * Map validated `corpus.knowledge_graph` params → KnowledgeGraph3DScene props.
 * Node color derives from kind; radius grows gently with degree so a highly-cited
 * paper reads as a hub. Edge color/direction/particles derive from kind (only
 * `cites` flows particles). Dangling edges (endpoint not in nodes) are dropped —
 * the scene does the same, so degree/radius stay consistent with what renders.
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
declare function KnowledgeGraphA11yList({ nodes, edges, selectedId, onSelect, query, className, label, nodePageSize, }: KnowledgeGraphA11yListProps): react.JSX.Element;

interface KnowledgeGraph3DNode {
    id: string;
    label: string;
    color: string;
    radius: number;
    kind: string;
}
interface KnowledgeGraph3DEdge {
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

export { type ControlsHandle, DEFAULT_A11Y_NODE_PAGE_SIZE, DEFAULT_GRAPH_NODE_RADIUS, GRAPH_LAYOUT_TICK_SECONDS, type KnowledgeGraph3DEdge, type KnowledgeGraph3DNode, KnowledgeGraph3DScene, type KnowledgeGraph3DSceneProps, KnowledgeGraphA11yList, type KnowledgeGraphA11yListProps, type KnowledgeGraphEdgeKind, type KnowledgeGraphNodeKind, MAX_A11Y_NODE_PAGE_SIZE, MAX_GRAPH_LAYOUT_TICKS_PER_FRAME, MAX_GRAPH_NODE_RADIUS, MAX_GRAPH_QUERY_LENGTH, MAX_KNOWLEDGE_GRAPH_SCENE_EDGES, MAX_KNOWLEDGE_GRAPH_SCENE_NODES, type MapCorpusGraphOptions, type MappedCorpusGraph, advanceGraphLayoutClock, assertKnowledgeGraphBudget, buildAdjacency, defaultEdgeStyles, defaultNodeColors, filterGraphEdges, flowParticleCount, graphSignature, mapCorpusKnowledgeGraph, matchesGraphQuery, normalizeGraphNodeRadius, normalizeGraphQuery, reducedMotionLayoutTickBudget };
