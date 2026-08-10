import { k as ReadonlySemanticPalette } from "../vizSpec-DXKitvuD.cjs";
import { a as KnowledgeGraphAttributes, c as KnowledgeGraphEpistemic, d as KnowledgeGraphUncalibratedScore, l as KnowledgeGraphEvidenceRef, n as KnowledgeGraph3DNode, o as KnowledgeGraphContext, s as KnowledgeGraphEdgeKind, t as KnowledgeGraph3DEdge, u as KnowledgeGraphNodeKind } from "../knowledgeGraphPresentation.types-B_2wcZ1W.cjs";
import { $ as isKnowledgeGraphLiveForceWithinBudget, A as MAX_KNOWLEDGE_GRAPH_PRESENTATION_NODES, B as corpusGraphInstanceIdentity, C as MAX_GRAPH_LAYOUT_TICKS_PER_FRAME, D as MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES, E as MAX_GRAPH_QUERY_LENGTH, F as assertKnowledgeGraphPresentationBudget, G as flowParticleCount, H as defaultEdgeStyles, I as assertRenderableGraphEdges, J as graphEdgeCurvePointInto, K as graphCameraTargetDamping, L as assertUniqueGraphNodeIds, M as advanceGraphLayoutClockInto, N as assertKnowledgeGraphIdentity, O as MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES, P as assertKnowledgeGraphLiveForceBudget, Q as graphSignature, R as assignGraphEdgeLanes, S as MAX_GRAPH_EDGE_LANE_OFFSET, T as MAX_GRAPH_PARALLEL_EDGES, U as defaultNodeColors, V as corpusGraphRadiusMeaning, W as filterGraphEdges, X as graphEdgeTargetBoundaryInto, Y as graphEdgeMatchesQuery, Z as graphQueryMatchIds, _ as GraphLayoutClockResult, a as PrepareCorpusKnowledgeGraphFigureOptionsV1, at as uniqueGraphTopologyLinks, b as GraphTopologyLink, c as prepareCorpusKnowledgeGraphFigureJson, d as GRAPH_EDGE_CURVE_SEGMENTS, et as knowledgeGraphLiveForceAvailability, f as GRAPH_EDGE_LANE_SPACING, g as GraphEdgeLane, h as GraphEdgeIdentity, i as KnowledgeGraphFigureSourceInputAssuranceV1, it as reducedMotionLayoutTickBudget, j as advanceGraphLayoutClock, k as MAX_KNOWLEDGE_GRAPH_PRESENTATION_EDGES, l as CORPUS_GRAPH_RADIUS_MEANING, m as GRAPH_LAYOUT_TICK_SECONDS, n as KnowledgeGraphFigureHostPolicyV1, nt as normalizeGraphNodeRadius, o as PrepareCorpusKnowledgeGraphFigureResultV1, p as GRAPH_EDGE_TARGET_BOUNDARY_SOLVE_ITERATIONS, q as graphEdgeControlPointInto, r as KnowledgeGraphFigurePreparationErrorV1, rt as normalizeGraphQuery, s as prepareCorpusKnowledgeGraphFigure, t as AcceptedKnowledgeGraphFigureSourceV1, tt as matchesGraphQuery, u as DEFAULT_GRAPH_NODE_RADIUS, v as GraphPoint3, w as MAX_GRAPH_NODE_RADIUS, x as KnowledgeGraphLiveForceAvailabilityV1, y as GraphSearchNode, z as buildAdjacency } from "../knowledgeGraphFigure-C-g1-MfO.cjs";
import { n as KnowledgeGraphViewPolicyV1$2 } from "../KnowledgeGraphCorpusFrame.internal-Ca8p2VTN.cjs";
import { ReactElement, ReactNode, RefObject } from "react";
import { KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1, KnowledgeGraphPresentationBudgetReceiptV1, KnowledgeGraphPresentationInputAssuranceV1, KnowledgeGraphPresentationInputV1, KnowledgeGraphPresentationJsonError, KnowledgeGraphPresentationMappingAuthorityV1, KnowledgeGraphViewPolicyV1, PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1, PREPARED_KNOWLEDGE_GRAPH_VIEW_V1, PreparedCorpusKnowledgeGraphPresentationV1, PreparedGenericKnowledgeGraphPresentationV1, PreparedGenericKnowledgeGraphPresentationV1 as PreparedGenericKnowledgeGraphPresentationV1$1, PreparedKnowledgeGraphPresentationV1, PreparedKnowledgeGraphViewV1, PreparedKnowledgeGraphViewV1 as PreparedKnowledgeGraphViewV1$1, assertPreparedGenericKnowledgeGraphPresentation, assertPreparedKnowledgeGraphPresentation, assertPreparedKnowledgeGraphView, isPreparedKnowledgeGraphPresentation, isPreparedKnowledgeGraphView, knowledgeGraphPresentationContainsNode, knowledgeGraphViewContainsNode, parseKnowledgeGraphPresentationJson, prepareKnowledgeGraphPresentation, prepareKnowledgeGraphView, serializePreparedKnowledgeGraphPresentation } from "#cortexel-knowledge-graph-presentation-capability";
import * as THREE from "three";
//#region react/KnowledgeGraph3DScene.d.ts
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
  view?: PreparedKnowledgeGraphViewV1$1;
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
  /** Flow markers are static by default so a settled demand-rendered graph is
   *  genuinely idle. Hosts may opt into continuous motion as a redundant cue;
   *  static arrowheads remain the direction-bearing encoding either way. */
  flowMotion?: 'static' | 'animated';
  /** Controls light-safe dimming/blending; defaults to the legacy dark surface. */
  themeMode?: 'dark' | 'light';
  /** Host-detected `prefers-reduced-motion` (same contract as the Expandable*
   *  scenes): run a bounded static refinement from the deterministic seed,
   *  hold flow particles still, and snap fly-to instead of easing. */
  reducedMotion?: boolean;
}
interface KnowledgeGraph3DSceneProps extends KnowledgeGraph3DSceneCommonProps {
  /** Direct primitives accept only caller-declared generic visual graphs. */
  presentation: PreparedGenericKnowledgeGraphPresentationV1$1;
}
declare function KnowledgeGraph3DScene(props: KnowledgeGraph3DSceneProps): import("react").JSX.Element;
//#endregion
//#region react/KnowledgeGraphA11yList.d.ts
declare const DEFAULT_A11Y_NODE_PAGE_SIZE = 25;
declare const MAX_A11Y_NODE_PAGE_SIZE = 100;
interface KnowledgeGraphA11yListCommonProps {
  /** Exact-source-bound visible subset; omission exposes the full presentation. */
  view?: PreparedKnowledgeGraphViewV1$1;
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
  presentation: PreparedGenericKnowledgeGraphPresentationV1$1;
}
interface KnowledgeGraphLegendCommonProps {
  view?: PreparedKnowledgeGraphViewV1$1;
  className?: string;
  label?: string;
  /** Must match the companion scene; defaults to the scene's dark policy. */
  themeMode?: 'dark' | 'light';
}
interface KnowledgeGraphLegendProps extends KnowledgeGraphLegendCommonProps {
  /** Direct primitives accept only caller-declared generic visual graphs. */
  presentation: PreparedGenericKnowledgeGraphPresentationV1$1;
}
declare function KnowledgeGraphA11yList(props: KnowledgeGraphA11yListProps): import("react").JSX.Element;
/** Canvas-external decoding companion for interactive views and DOM-inclusive
 * still captures. Text redundantly carries kind, color, direction, and count. */
declare function KnowledgeGraphLegend(props: KnowledgeGraphLegendProps): import("react").JSX.Element;
//#endregion
//#region react/KnowledgeGraphStaticRecordView.d.ts
interface KnowledgeGraphStaticRecordViewCommonProps {
  /** Optional view disclosure; records below remain the complete source token. */
  readonly view?: PreparedKnowledgeGraphViewV1$1;
  readonly className?: string;
  readonly label?: string;
  readonly nodePageSize?: number;
  readonly edgePageSize?: number;
}
interface KnowledgeGraphStaticRecordViewProps extends KnowledgeGraphStaticRecordViewCommonProps {
  /** Direct primitives accept only caller-declared generic visual graphs. */
  readonly presentation: PreparedGenericKnowledgeGraphPresentationV1$1;
}
/**
 * Deterministic paginated DOM browser for every record in a prepared graph.
 * Ordering uses exact ECMAScript UTF-16 code-unit comparison and never depends
 * on force-layout geometry, locale data, pointer state, or animation. One page
 * is mounted at a time so the DOM remains bounded at the maximum graph size.
 */
declare function KnowledgeGraphStaticRecordView(props: KnowledgeGraphStaticRecordViewProps): import("react").JSX.Element;
//#endregion
//#region react/KnowledgeGraphAccessibleFigure.d.ts
type KnowledgeGraphVisualHostContextV1 = KnowledgeGraphFigureHostPolicyV1;
type KnowledgeGraphVisualRenderer = (scene: ReactElement, context: KnowledgeGraphVisualHostContextV1) => ReactNode;
interface KnowledgeGraphAccessibleFigureCommonProps {
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
  readonly viewPolicy?: KnowledgeGraphViewPolicyV1$2;
  readonly query?: string;
  readonly controlsRef?: RefObject<ControlsHandle | null>;
  /** Defaults true for the canonical composition; set false to retain host camera. */
  readonly autoFrame?: boolean;
  readonly flyToSelection?: boolean;
  readonly labelColor?: string;
  readonly particleColor?: string;
  /** Static by default; opt into continuous flow-marker motion explicitly. */
  readonly flowMotion?: 'static' | 'animated';
  readonly reducedMotion?: boolean;
  readonly nodePageSize?: number;
  readonly recordNodePageSize?: number;
  readonly recordEdgePageSize?: number;
  readonly activePalette?: ReadonlySemanticPalette;
  readonly className?: string;
  readonly label?: string;
}
type KnowledgeGraphAccessibleFigureProps = KnowledgeGraphAccessibleFigureCommonProps & ({
  /** Materialized self-describing legacy VizSpec; duplicates are no longer observable. */
  readonly spec: unknown;
  readonly specJson?: never;
} | {
  /** Raw VizSpec JSON; duplicate members are rejected before materialization. */
  readonly spec?: never;
  readonly specJson: string;
});
/**
 * Canonical legacy 3D corpus-graph composition. It binds strict validation,
 * mapping, caption, legend, interactive DOM controls, and a paginated record
 * view to one detached presentation. Unit tests establish those narrow
 * composition invariants only—not whole-figure WCAG, browser, WebGL, or
 * assistive-technology conformance.
 */
declare function KnowledgeGraphAccessibleFigure(props: KnowledgeGraphAccessibleFigureProps): import("react").JSX.Element;
//#endregion
export { type AcceptedKnowledgeGraphFigureSourceV1, CORPUS_GRAPH_RADIUS_MEANING, type ControlsHandle, DEFAULT_A11Y_NODE_PAGE_SIZE, DEFAULT_GRAPH_NODE_RADIUS, GRAPH_EDGE_CURVE_SEGMENTS, GRAPH_EDGE_LANE_SPACING, GRAPH_EDGE_TARGET_BOUNDARY_SOLVE_ITERATIONS, GRAPH_LAYOUT_TICK_SECONDS, type GraphEdgeIdentity, type GraphEdgeLane, type GraphLayoutClockResult, type GraphPoint3, type GraphSearchNode, type GraphTopologyLink, KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1, type KnowledgeGraph3DEdge, type KnowledgeGraph3DNode, KnowledgeGraph3DScene, type KnowledgeGraph3DSceneProps, KnowledgeGraphA11yList, type KnowledgeGraphA11yListProps, KnowledgeGraphAccessibleFigure, type KnowledgeGraphAccessibleFigureCommonProps, type KnowledgeGraphAccessibleFigureProps, type KnowledgeGraphAttributes, type KnowledgeGraphContext, type KnowledgeGraphEdgeKind, type KnowledgeGraphEpistemic, type KnowledgeGraphEvidenceRef, type KnowledgeGraphFigureHostPolicyV1, type KnowledgeGraphFigurePreparationErrorV1, type KnowledgeGraphFigureSourceInputAssuranceV1, KnowledgeGraphLegend, type KnowledgeGraphLegendProps, type KnowledgeGraphLiveForceAvailabilityV1, type KnowledgeGraphNodeKind, type KnowledgeGraphPresentationBudgetReceiptV1, type KnowledgeGraphPresentationInputAssuranceV1, type KnowledgeGraphPresentationInputV1, KnowledgeGraphPresentationJsonError, type KnowledgeGraphPresentationMappingAuthorityV1, KnowledgeGraphStaticRecordView, type KnowledgeGraphStaticRecordViewProps, type KnowledgeGraphUncalibratedScore, type KnowledgeGraphViewPolicyV1, type KnowledgeGraphVisualHostContextV1, type KnowledgeGraphVisualRenderer, MAX_A11Y_NODE_PAGE_SIZE, MAX_GRAPH_EDGE_LANE_OFFSET, MAX_GRAPH_LAYOUT_TICKS_PER_FRAME, MAX_GRAPH_NODE_RADIUS, MAX_GRAPH_PARALLEL_EDGES, MAX_GRAPH_QUERY_LENGTH, MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES, MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_NODES, MAX_KNOWLEDGE_GRAPH_PRESENTATION_EDGES, MAX_KNOWLEDGE_GRAPH_PRESENTATION_NODES, PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1, PREPARED_KNOWLEDGE_GRAPH_VIEW_V1, type PrepareCorpusKnowledgeGraphFigureOptionsV1, type PrepareCorpusKnowledgeGraphFigureResultV1, type PreparedCorpusKnowledgeGraphPresentationV1, type PreparedGenericKnowledgeGraphPresentationV1, type PreparedKnowledgeGraphPresentationV1, type PreparedKnowledgeGraphViewV1, advanceGraphLayoutClock, advanceGraphLayoutClockInto, assertKnowledgeGraphIdentity, assertKnowledgeGraphLiveForceBudget, assertKnowledgeGraphPresentationBudget, assertPreparedGenericKnowledgeGraphPresentation, assertPreparedKnowledgeGraphPresentation, assertPreparedKnowledgeGraphView, assertRenderableGraphEdges, assertUniqueGraphNodeIds, assignGraphEdgeLanes, buildAdjacency, corpusGraphInstanceIdentity, corpusGraphRadiusMeaning, defaultEdgeStyles, defaultNodeColors, filterGraphEdges, flowParticleCount, graphCameraTargetDamping, graphEdgeControlPointInto, graphEdgeCurvePointInto, graphEdgeMatchesQuery, graphEdgeTargetBoundaryInto, graphQueryMatchIds, graphSignature, isKnowledgeGraphLiveForceWithinBudget, isPreparedKnowledgeGraphPresentation, isPreparedKnowledgeGraphView, knowledgeGraphLiveForceAvailability, knowledgeGraphPresentationContainsNode, knowledgeGraphViewContainsNode, matchesGraphQuery, normalizeGraphNodeRadius, normalizeGraphQuery, parseKnowledgeGraphPresentationJson, prepareCorpusKnowledgeGraphFigure, prepareCorpusKnowledgeGraphFigureJson, prepareKnowledgeGraphPresentation, prepareKnowledgeGraphView, reducedMotionLayoutTickBudget, serializePreparedKnowledgeGraphPresentation, uniqueGraphTopologyLinks };
