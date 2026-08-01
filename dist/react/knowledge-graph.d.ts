import * as react from 'react';
import { ReactElement, ReactNode } from 'react';
import * as THREE from 'three';
import { P as PreparedKnowledgeGraphViewV1, a as PreparedGenericKnowledgeGraphPresentationV1, K as KnowledgeGraphViewPolicyV1 } from '../knowledgeGraphPresentation.internal-BozN4u6p.js';
export { b as KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1, c as KnowledgeGraph3DEdge, d as KnowledgeGraph3DNode, e as KnowledgeGraphAttributes, f as KnowledgeGraphContext, g as KnowledgeGraphEdgeKind, h as KnowledgeGraphEpistemic, i as KnowledgeGraphEvidenceRef, j as KnowledgeGraphNodeKind, k as KnowledgeGraphPresentationBudgetReceiptV1, l as KnowledgeGraphPresentationInputAssuranceV1, m as KnowledgeGraphPresentationInputV1, n as KnowledgeGraphPresentationJsonError, o as KnowledgeGraphPresentationMappingAuthorityV1, p as KnowledgeGraphUncalibratedScore, q as PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1, r as PREPARED_KNOWLEDGE_GRAPH_VIEW_V1, s as PreparedCorpusKnowledgeGraphPresentationV1, t as PreparedKnowledgeGraphPresentationV1, u as assertPreparedGenericKnowledgeGraphPresentation, v as assertPreparedKnowledgeGraphPresentation, w as assertPreparedKnowledgeGraphView, x as isPreparedKnowledgeGraphPresentation, y as isPreparedKnowledgeGraphView, z as knowledgeGraphPresentationContainsNode, A as knowledgeGraphViewContainsNode, B as parseKnowledgeGraphPresentationJson, C as prepareKnowledgeGraphPresentation, D as prepareKnowledgeGraphView, E as serializePreparedKnowledgeGraphPresentation } from '../knowledgeGraphPresentation.internal-BozN4u6p.js';
import { R as ReadonlySemanticPalette } from '../vizSpec-Bfwh_kq9.js';
import { K as KnowledgeGraphFigureHostPolicyV1 } from '../index-CO82lZlM.js';
export { A as AcceptedKnowledgeGraphFigureSourceV1, C as CORPUS_GRAPH_RADIUS_MEANING, D as DEFAULT_GRAPH_NODE_RADIUS, G as GRAPH_EDGE_CURVE_SEGMENTS, a as GRAPH_EDGE_LANE_SPACING, b as GRAPH_EDGE_TARGET_BOUNDARY_SOLVE_ITERATIONS, c as GRAPH_LAYOUT_TICK_SECONDS, d as GraphEdgeIdentity, e as GraphEdgeLane, f as GraphLayoutClockResult, g as GraphPoint3, h as GraphSearchNode, i as GraphTopologyLink, j as KnowledgeGraphFigurePreparationErrorV1, k as KnowledgeGraphFigureSourceInputAssuranceV1, l as KnowledgeGraphLiveForceAvailabilityV1, M as MAX_GRAPH_EDGE_LANE_OFFSET, m as MAX_GRAPH_LAYOUT_TICKS_PER_FRAME, n as MAX_GRAPH_NODE_RADIUS, o as MAX_GRAPH_PARALLEL_EDGES, p as MAX_GRAPH_QUERY_LENGTH, q as MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES, r as MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES, s as MAX_KNOWLEDGE_GRAPH_PRESENTATION_EDGES, t as MAX_KNOWLEDGE_GRAPH_PRESENTATION_NODES, P as PrepareCorpusKnowledgeGraphFigureOptionsV1, u as PrepareCorpusKnowledgeGraphFigureResultV1, v as advanceGraphLayoutClock, w as advanceGraphLayoutClockInto, x as assertKnowledgeGraphIdentity, y as assertKnowledgeGraphLiveForceBudget, z as assertKnowledgeGraphPresentationBudget, B as assertRenderableGraphEdges, E as assertUniqueGraphNodeIds, F as assignGraphEdgeLanes, H as buildAdjacency, I as corpusGraphInstanceIdentity, J as corpusGraphRadiusMeaning, L as defaultEdgeStyles, N as defaultNodeColors, O as filterGraphEdges, Q as flowParticleCount, R as graphCameraTargetDamping, S as graphEdgeControlPointInto, T as graphEdgeCurvePointInto, U as graphEdgeMatchesQuery, V as graphEdgeTargetBoundaryInto, W as graphQueryMatchIds, X as graphSignature, Y as isKnowledgeGraphLiveForceWithinBudget, Z as knowledgeGraphLiveForceAvailability, _ as matchesGraphQuery, $ as normalizeGraphNodeRadius, a0 as normalizeGraphQuery, a1 as prepareCorpusKnowledgeGraphFigure, a2 as prepareCorpusKnowledgeGraphFigureJson, a3 as reducedMotionLayoutTickBudget, a4 as uniqueGraphTopologyLinks } from '../index-CO82lZlM.js';
import '../errors-DOfZeMp8.js';
import '#cortexel-knowledge-graph-presentation-brand';
import 'zod';

declare const DEFAULT_A11Y_NODE_PAGE_SIZE = 25;
declare const MAX_A11Y_NODE_PAGE_SIZE = 100;
interface KnowledgeGraphA11yListCommonProps {
    /** Exact-source-bound visible subset; omission exposes the full presentation. */
    view?: PreparedKnowledgeGraphViewV1;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    query?: string;
    className?: string;
    label?: string;
    /** Node rows rendered at once. Relationship detail has its own pager. */
    nodePageSize?: number;
}
interface KnowledgeGraphA11yListProps extends KnowledgeGraphA11yListCommonProps {
    /** Direct primitives accept only caller-declared generic visual graphs. */
    presentation: PreparedGenericKnowledgeGraphPresentationV1;
}
interface KnowledgeGraphLegendCommonProps {
    view?: PreparedKnowledgeGraphViewV1;
    className?: string;
    label?: string;
    /** Must match the companion scene; defaults to the scene's dark policy. */
    themeMode?: 'dark' | 'light';
}
interface KnowledgeGraphLegendProps extends KnowledgeGraphLegendCommonProps {
    /** Direct primitives accept only caller-declared generic visual graphs. */
    presentation: PreparedGenericKnowledgeGraphPresentationV1;
}
declare function KnowledgeGraphA11yList(props: KnowledgeGraphA11yListProps): react.JSX.Element;
/** Canvas-external decoding companion for interactive views and DOM-inclusive
 * still captures. Text redundantly carries kind, color, direction, and count. */
declare function KnowledgeGraphLegend(props: KnowledgeGraphLegendProps): react.JSX.Element;

interface KnowledgeGraphStaticRecordViewCommonProps {
    /** Optional view disclosure; records below remain the complete source token. */
    readonly view?: PreparedKnowledgeGraphViewV1;
    readonly className?: string;
    readonly label?: string;
    readonly nodePageSize?: number;
    readonly edgePageSize?: number;
}
interface KnowledgeGraphStaticRecordViewProps extends KnowledgeGraphStaticRecordViewCommonProps {
    /** Direct primitives accept only caller-declared generic visual graphs. */
    readonly presentation: PreparedGenericKnowledgeGraphPresentationV1;
}
/**
 * Deterministic paginated DOM browser for every record in a prepared graph.
 * Ordering uses exact ECMAScript UTF-16 code-unit comparison and never depends
 * on force-layout geometry, locale data, pointer state, or animation. One page
 * is mounted at a time so the DOM remains bounded at the maximum graph size.
 */
declare function KnowledgeGraphStaticRecordView(props: KnowledgeGraphStaticRecordViewProps): react.JSX.Element;

type KnowledgeGraphVisualHostContextV1 = KnowledgeGraphFigureHostPolicyV1;
type KnowledgeGraphVisualRenderer = (scene: ReactElement, context: KnowledgeGraphVisualHostContextV1) => ReactNode;
interface KnowledgeGraphAccessibleFigureCommonProps {
    /** Host retains Canvas, controls, camera, postprocessing, and asset authority. */
    /**
     * Invoked synchronously (including during SSR) with the checked scene and host
     * policy. The host owns Canvas/client boundaries, controls/camera application,
     * frameloop, assets, postprocessing, context-loss detection, and errors outside
     * React descendant render/lifecycle work.
     */
    readonly renderVisual: KnowledgeGraphVisualRenderer;
    readonly selectedId: string | null;
    /** Receives null when a source/view transition invalidates controlled selection. */
    readonly onSelect: (id: string | null) => void;
    readonly hoverId: string | null;
    readonly onHover: (id: string | null) => void;
    /**
     * Set false when the host detects that its visual surface is unavailable
     * (including WebGL/context failures that React cannot observe).
     */
    readonly visualAvailable?: boolean;
    /** Increment/change after repairing a failed host visual without replacing spec. */
    readonly visualRetryKey?: string | number;
    /** Strict host-owned kind filters; omission means the complete prepared graph. */
    readonly viewPolicy?: KnowledgeGraphViewPolicyV1;
    readonly query?: string;
    readonly controlsRef?: React.RefObject<ControlsHandle | null>;
    /** Defaults true for the canonical composition; set false to retain host camera. */
    readonly autoFrame?: boolean;
    readonly flyToSelection?: boolean;
    readonly labelColor?: string;
    readonly particleColor?: string;
    readonly reducedMotion?: boolean;
    readonly nodePageSize?: number;
    readonly recordNodePageSize?: number;
    readonly recordEdgePageSize?: number;
    readonly activePalette?: ReadonlySemanticPalette;
    readonly className?: string;
    readonly label?: string;
}
type KnowledgeGraphAccessibleFigureProps = KnowledgeGraphAccessibleFigureCommonProps & ({
    /** Materialized self-describing legacy VizSpec; duplicate members are no longer observable. */
    readonly spec: unknown;
    readonly specJson?: never;
} | {
    /** Raw VizSpec JSON; duplicate members are rejected before materialization. */
    readonly spec?: never;
    readonly specJson: string;
});
/**
 * Canonical legacy corpus-graph composition. It binds strict validation,
 * mapping, caption, legend, interactive DOM controls, and a paginated record
 * view to one detached presentation. Unit tests establish those narrow
 * composition invariants only—not whole-figure WCAG, browser, WebGL, or
 * assistive-technology conformance.
 */
declare function KnowledgeGraphAccessibleFigure(props: KnowledgeGraphAccessibleFigureProps): react.JSX.Element;

/** Minimal OrbitControls surface the scene needs for auto-frame + fly-to. The
 *  controls themselves stay host-side (Design Law #5); the host passes a ref. */
interface ControlsCore {
    target: THREE.Vector3;
    update: () => void;
}
interface ControlsStartEventSurface {
    /** Optional EventDispatcher surface (OrbitControls has it). When present, the
     *  scene cancels its own camera moves on 'start' (user grab: drag/zoom
     *  begin) — the user's hand always wins over auto-frame and fly-to. */
    addEventListener(type: 'start', listener: () => void): void;
    removeEventListener(type: 'start', listener: () => void): void;
}
/** Controls either expose a complete removable start-event surface or none. */
type ControlsHandle = ControlsCore & (ControlsStartEventSurface | {
    addEventListener?: never;
    removeEventListener?: never;
});
interface KnowledgeGraph3DSceneCommonProps {
    /** Optional exact-source-bound view shared with every companion. */
    view?: PreparedKnowledgeGraphViewV1;
    selectedId: string | null;
    query: string;
    onSelect: (id: string | null) => void;
    hoverId: string | null;
    onHover: (id: string | null) => void;
    /** Host-owned OrbitControls ref. Auto-frame also works without controls by
     *  aiming the camera directly; selection fly-to requires controls. */
    controlsRef?: React.RefObject<ControlsHandle | null>;
    /** One-shot camera framing is opt-in at this primitive; the host owns the frame. */
    autoFrame?: boolean;
    /** Move the host controls target to selected nodes. Requires controlsRef. */
    flyToSelection?: boolean;
    /** Focus-label color. The theme defaults are contrast-paired; a custom color
     *  makes contrast against the documented theme background host-owned. */
    labelColor?: string;
    /** Citation-flow particle color (a single visual language for flow). */
    particleColor?: string;
    /** Controls light-safe dimming/blending; defaults to the legacy dark surface. */
    themeMode?: 'dark' | 'light';
    /** Host-detected `prefers-reduced-motion` (same contract as the Expandable*
     *  scenes): run a bounded static refinement from the deterministic seed,
     *  hold flow particles still, and snap fly-to instead of easing. */
    reducedMotion?: boolean;
}
interface KnowledgeGraph3DSceneProps extends KnowledgeGraph3DSceneCommonProps {
    /** Direct primitives accept only caller-declared generic visual graphs. */
    presentation: PreparedGenericKnowledgeGraphPresentationV1;
}
declare function KnowledgeGraph3DScene(props: KnowledgeGraph3DSceneProps): react.JSX.Element;

export { type ControlsHandle, DEFAULT_A11Y_NODE_PAGE_SIZE, KnowledgeGraph3DScene, type KnowledgeGraph3DSceneProps, KnowledgeGraphA11yList, type KnowledgeGraphA11yListProps, KnowledgeGraphAccessibleFigure, type KnowledgeGraphAccessibleFigureCommonProps, type KnowledgeGraphAccessibleFigureProps, KnowledgeGraphFigureHostPolicyV1, KnowledgeGraphLegend, type KnowledgeGraphLegendProps, KnowledgeGraphStaticRecordView, type KnowledgeGraphStaticRecordViewProps, KnowledgeGraphViewPolicyV1, type KnowledgeGraphVisualHostContextV1, type KnowledgeGraphVisualRenderer, MAX_A11Y_NODE_PAGE_SIZE, PreparedGenericKnowledgeGraphPresentationV1, PreparedKnowledgeGraphViewV1 };
