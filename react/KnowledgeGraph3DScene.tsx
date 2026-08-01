// KnowledgeGraph3DScene — a Canvas-less, host-agnostic 3D corpus-knowledge-graph
// scene primitive (Design Law #5: the library renders ONLY scene contents; the
// host owns <Canvas>, OrbitControls, bloom, background, fog and Stars).
//
// It draws abstract KnowledgeGraph3DNode / KnowledgeGraph3DEdge records — each
// carrying its own precomputed color, radius and kind — so the same implementation
// draws a generic graph or the canonical corpus composition. Public direct use accepts
// only a prepared generic_visual capability; corpus mapping remains package-internal so
// supported callers cannot detach it from the bound honesty caption.
//
// Design (follows the R3F best-practices skill):
//   • The d3-force-3d simulation is ticked inside useFrame and its positions are
//     written straight into the instanced matrix / line buffers via refs — NEVER
//     through React state (no per-frame re-renders).
//   • React state changes only on discrete events (hover id, selection) and
//     drive the emphasis recolor + the single floating label, not the loop.
//   • Nodes are one unlit instancedMesh; edges are one lineSegments; citation
//     flow is one instanced particle cloud. Light mode avoids additive blending.
//   • Cortexel's useFrame body has no explicit allocation syntax. The invoked
//     d3-force-3d tick is not allocation-free: it rebuilds spatial indexes.
//   • Within the pinned JS/runtime, identical ordered inputs use d3-force-3d's
//     deterministic phyllotaxis seed and LCG. This does not claim byte-identical
//     pixels across browsers, GPUs, fonts, or floating-point implementations.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  useFrame,
  useThree,
  type RootState,
  type ThreeEvent,
} from '@react-three/fiber';
import * as THREE from 'three';
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceCollide,
  type Simulation,
  type SimLink,
} from 'd3-force-3d';
import {
  advanceGraphLayoutClockInto,
  assignGraphEdgeLanes,
  assertKnowledgeGraphLiveForceBudget,
  assertKnowledgeGraphIdentity,
  buildAdjacency,
  filterGraphEdges,
  GRAPH_EDGE_CURVE_SEGMENTS,
  graphEdgeControlPointInto,
  graphEdgeCurvePointInto,
  graphEdgeTargetBoundaryInto,
  graphEdgeMatchesQuery,
  graphCameraTargetDamping,
  graphQueryMatchIds,
  MAX_GRAPH_EDGE_LANE_OFFSET,
  MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES,
  normalizeGraphQuery,
  reducedMotionLayoutTickBudget,
  uniqueGraphTopologyLinks,
  type GraphEdgeLane,
} from './knowledgeGraph';
import type {
  KnowledgeGraph3DEdge,
  KnowledgeGraph3DNode,
} from './knowledgeGraphPresentation.types';
import {
  planGraphLayoutCache,
  publishGraphLayoutCache,
  snapshotGraphLayoutInputs,
  type GraphLayoutCacheBuffer,
  type GraphLayoutNode,
  type GraphLayoutPosition,
} from './knowledgeGraphLayout.internal';
import {
  installFocusLabelResource,
  knowledgeGraphFocusLabelSpriteCenterY,
} from './focusLabelResource.internal';
import {
  assertPreparedCorpusKnowledgeGraphPresentation,
  assertPreparedGenericKnowledgeGraphPresentation,
  assertPreparedKnowledgeGraphView,
  assertPreparedKnowledgeGraphPresentation,
  knowledgeGraphViewContainsNode,
  type PreparedCorpusKnowledgeGraphPresentationV1,
  type PreparedGenericKnowledgeGraphPresentationV1,
  type PreparedKnowledgeGraphViewV1,
} from './knowledgeGraphPresentation.internal';
import {
  assertKnowledgeGraphColor,
  assertKnowledgeGraphNodeReference,
} from './knowledgeGraphPresentationProps.internal';
import {
  beginKnowledgeGraphRuntimeTransition,
  handleKnowledgeGraphNodeClick,
  handleKnowledgeGraphPointerOut,
  isKnowledgeGraphInstanceId,
  synchronizeKnowledgeGraphControlsListener,
  toggledKnowledgeGraphSelection,
} from './knowledgeGraphInteraction.internal';
import {
  isKnowledgeGraphCameraParentChainIdentity,
  isKnowledgeGraphCameraSelfTransformCanonical,
  isKnowledgeGraphCameraVectorFinite,
  isKnowledgeGraphCenteredAutoFrameProjectionSupported,
  isKnowledgeGraphOrthographicProjectionReady,
  isKnowledgeGraphPerspectiveProjectionReady,
  knowledgeGraphCameraProjectionKind,
  planKnowledgeGraphCameraClippingInto,
  planKnowledgeGraphOrthographicCameraFitInto,
  planKnowledgeGraphPerspectiveCameraFitInto,
} from './knowledgeGraphCamera.internal';
import {
  advanceKnowledgeGraphFlowPhase,
  planFlowParticleDistribution,
  reducedMotionFlowParticleFraction,
} from './knowledgeGraphParticles.internal';
import { safeDiagnosticText } from '../core/safeRuntime';
import {
  KNOWLEDGE_GRAPH_DIRECTION_MARKER_LENGTH,
  KNOWLEDGE_GRAPH_BOX_SHELL_SIDE,
  KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE,
  knowledgeGraphAutoFrameNodeRadialExtent,
  knowledgeGraphContrastSafeColor,
  knowledgeGraphEdgeStrokeSegmentVisible,
  knowledgeGraphNodeEmphasisDimAmount,
  knowledgeGraphRenderedNodeRadialExtent,
  knowledgeGraphRenderedNodeScale,
} from './knowledgeGraphVisualEncoding.internal';

export type { KnowledgeGraph3DEdge, KnowledgeGraph3DNode } from
  './knowledgeGraphPresentation.types';

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
export type ControlsHandle = ControlsCore & (
  | ControlsStartEventSurface
  | { addEventListener?: never; removeEventListener?: never }
);

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

export interface KnowledgeGraph3DSceneProps
  extends KnowledgeGraph3DSceneCommonProps {
  /** Direct primitives accept only caller-declared generic visual graphs. */
  presentation: PreparedGenericKnowledgeGraphPresentationV1;
}

interface KnowledgeGraphCorpus3DSceneInternalProps
  extends KnowledgeGraph3DSceneCommonProps {
  /** Corpus presentations remain package-internal to the caption-bound composition. */
  presentation: PreparedCorpusKnowledgeGraphPresentationV1;
}

type KnowledgeGraph3DSceneSurfaceProps =
  | KnowledgeGraph3DSceneProps
  | KnowledgeGraphCorpus3DSceneInternalProps;

interface KnowledgeGraph3DSceneInstanceProps
  extends Omit<KnowledgeGraph3DSceneCommonProps, 'view'> {
  readonly graphIdentity: string;
  readonly nodes: readonly KnowledgeGraph3DNode[];
  readonly edges: readonly KnowledgeGraph3DEdge[];
}

const PARTICLES_PER_EDGE = 4;
const GRAPH_DIRECTION_MARKER_PADDING = 2;
const GRAPH_LAYOUT_SETTLED_ALPHA = 0.008;
// The renderer admits at most this many edges. Keeping the particle cap bound to
// the same authority guarantees that every valid all-flow graph retains at least
// one visible flow marker if the scene budget changes in a future revision.
const MAX_PARTICLES = MAX_KNOWLEDGE_GRAPH_LIVE_FORCE_EDGES;
const FALLBACK_COLOR = '#64748b'; // deterministic fallback for an unparseable hex
// Cap the remembered-position cache so a long session streaming many distinct
// graphs cannot grow it without bound (positions still persist across filter
// toggles below this size — see posMap).
const MAX_REMEMBERED_POSITIONS = 5000;

// Reusable first-party scratch objects. d3's transitive tick implementation still
// allocates spatial indexes, so this is deliberately not an allocation-free claim.
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _darkDimTarget = new THREE.Color('#030711');
const _lightDimTarget = new THREE.Color('#f8fafc');
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _curveControl = new THREE.Vector3();
const _curvePoint = new THREE.Vector3();
const _curveNext = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _box = new THREE.Box3();
const _sphere = new THREE.Sphere();
const _layoutClockResult = { ticks: 0, remainderSeconds: 0 };
const _cameraFitResult = { distance: 0, orthographicZoom: undefined as number | undefined };
const _cameraClippingResult = { near: 0, far: 0 };
const _perspectiveAutoFrameProjection = {
  kind: 'perspective' as const,
  isArrayCamera: false,
  viewEnabled: false,
  parentTransformIdentity: false,
  selfTransformCanonical: false,
  cameraMethodsCanonical: false,
  projectionMethodCanonical: false,
  effectiveFovMethodCanonical: false,
  webGlCoordinateSystem: false,
  fovDegrees: 0,
  aspect: 0,
  zoom: 0,
  near: 0,
  far: 0,
  filmOffset: 0,
  projectionMatrixElements: [] as ArrayLike<number>,
};
const _orthographicAutoFrameProjection = {
  kind: 'orthographic' as const,
  isArrayCamera: false,
  viewEnabled: false,
  parentTransformIdentity: false,
  selfTransformCanonical: false,
  cameraMethodsCanonical: false,
  projectionMethodCanonical: false,
  webGlCoordinateSystem: false,
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  zoom: 0,
  near: 0,
  far: 0,
  projectionMatrixElements: [] as ArrayLike<number>,
};

// Stable selectors avoid subscribing the complete scene to unrelated R3F store
// updates and avoid manufacturing selector closures on every React render.
const selectCamera = (state: RootState) => state.camera;
const selectRenderer = (state: RootState) => state.gl;
const selectInvalidate = (state: RootState) => state.invalidate;
const disableKnowledgeGraphGlyphRaycast: THREE.Object3D['raycast'] = () => {};

/** Dev-only console warning (stripped by the consumer's production bundler). */
function devWarn(msg: string): void {
  if (
    typeof process !== 'undefined' &&
    process.env &&
    process.env.NODE_ENV === 'production'
  ) {
    return;
  }
  if (typeof console !== 'undefined' && console.warn) console.warn(`[cortexel] ${msg}`);
}

/** Dim a color toward the void background so unfocused elements stop blooming.
 *  Returns the SHARED module scratch (consumers copy it out immediately, so no
 *  allocation). An unparseable hex leaves the deterministic fallback rather than
 *  the previous call's color, so a bad datum never bleeds a neighbor's colour. */
function dim(
  hex: string,
  amount: number,
  themeMode: 'dark' | 'light',
): THREE.Color {
  _color.set(FALLBACK_COLOR); // reset: a failed .set() below is a no-op
  _color.set(hex);
  return _color.lerp(
    themeMode === 'light' ? _lightDimTarget : _darkDimTarget,
    amount,
  );
}

/** Network-free focus label. Drei/Troika's default Text path fetches fonts and
 *  unicode data from public CDNs; a CanvasTexture uses the host's system font
 *  and keeps Cortexel's no-implicit-network guarantee intact. GPU resources are
 *  created only after commit so an abandoned concurrent render cannot leak a
 *  texture whose cleanup effect never existed. */
function FocusLabelSprite({
  spriteRef,
  text,
  color,
  themeMode,
  invalidate,
}: {
  spriteRef: React.RefObject<THREE.Sprite | null>;
  text: string;
  color: string;
  themeMode: 'dark' | 'light';
  invalidate: () => void;
}) {
  const label = safeDiagnosticText(text, 120);
  const materialRef = useRef<THREE.SpriteMaterial>(null);
  useLayoutEffect(() => {
    const sprite = spriteRef.current;
    const material = materialRef.current;
    if (!sprite || !material) return undefined;
    return installFocusLabelResource({
      sprite,
      material,
      label,
      color,
      themeMode,
      invalidate,
    });
  }, [label, color, themeMode, invalidate]);

  return (
    <sprite
      ref={spriteRef}
      visible={false}
      frustumCulled={false}
      renderOrder={1_000}
    >
      <spriteMaterial
        ref={materialRef}
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}

type SimGraphNode = GraphLayoutNode;

interface GraphLayoutRuntime {
  graphKey: string;
  reducedMotion: boolean;
  sim: Simulation<SimGraphNode>;
  nodes: SimGraphNode[];
  cacheBuffers: readonly [GraphLayoutCacheBuffer, GraphLayoutCacheBuffer];
  nextCacheBufferIndex: 0 | 1;
}

/** Populate the one shared quadratic path definition consumed by lines,
 * arrowheads, and flow particles. Module-scope vectors avoid direct frame allocations. */
function setEdgeCurve(
  source: SimGraphNode,
  target: SimGraphNode,
  lane: Pick<GraphEdgeLane, 'laneOffset' | 'canonicalDirectionSign'>,
): void {
  _a.set(source.x ?? 0, source.y ?? 0, source.z ?? 0);
  _b.set(target.x ?? 0, target.y ?? 0, target.z ?? 0);
  graphEdgeControlPointInto(_a, _b, lane, _curveControl);
}

/** Allocation-free glyph upload shared by the three closed node-kind groups. */
function updateKnowledgeGraphGlyphMatrices(
  glyphMesh: THREE.InstancedMesh | null,
  nodeIndexes: readonly number[],
  simNodes: readonly SimGraphNode[],
  focus: string | null,
  focusSet: ReadonlySet<string> | null | undefined,
): void {
  if (glyphMesh === null) return;
  for (let glyphIndex = 0; glyphIndex < nodeIndexes.length; glyphIndex++) {
    const node = simNodes[nodeIndexes[glyphIndex]];
    const scale = knowledgeGraphRenderedNodeScale(
      focus !== null && (node.id === focus || focusSet?.has(node.id) === true),
    );
    _dummy.position.set(node.x ?? 0, node.y ?? 0, node.z ?? 0);
    _dummy.quaternion.identity();
    _dummy.scale.setScalar(node.r * scale);
    _dummy.updateMatrix();
    glyphMesh.setMatrixAt(glyphIndex, _dummy.matrix);
  }
  glyphMesh.instanceMatrix.needsUpdate = true;
  glyphMesh.boundingSphere = null;
}

/** Keep the redundant kind shell in the same focus/query salience state as its node. */
function updateKnowledgeGraphGlyphColors(
  glyphMesh: THREE.InstancedMesh | null,
  nodeIndexes: readonly number[],
  visualNodes: readonly { readonly id: string }[],
  glyphColor: string,
  focus: string | null,
  focusSet: ReadonlySet<string> | null | undefined,
  queryActive: boolean,
  queryMatchIds: ReadonlySet<string>,
  themeMode: 'dark' | 'light',
): void {
  if (glyphMesh === null) return;
  for (let glyphIndex = 0; glyphIndex < nodeIndexes.length; glyphIndex++) {
    const node = visualNodes[nodeIndexes[glyphIndex]];
    const amount = knowledgeGraphNodeEmphasisDimAmount(
      node.id,
      focus,
      focusSet,
      queryActive,
      queryMatchIds,
    );
    glyphMesh.setColorAt(glyphIndex, dim(glyphColor, amount, themeMode));
  }
  if (glyphMesh.instanceColor) glyphMesh.instanceColor.needsUpdate = true;
}

export function KnowledgeGraph3DScene(props: KnowledgeGraph3DSceneProps) {
  assertPreparedGenericKnowledgeGraphPresentation(props.presentation);
  if (props.view !== undefined) {
    assertPreparedKnowledgeGraphView(props.view, props.presentation);
  }
  const nodes = props.view?.nodes ?? props.presentation.nodes;
  const edges = props.view?.edges ?? props.presentation.edges;
  assertKnowledgeGraphLiveForceBudget(nodes.length, edges.length);
  return renderKnowledgeGraph3DScene(props);
}

/** Package-internal corpus renderer used only below the canonical caption. */
export function KnowledgeGraphCorpus3DSceneInternal(
  props: KnowledgeGraphCorpus3DSceneInternalProps,
) {
  assertPreparedCorpusKnowledgeGraphPresentation(props.presentation);
  if (props.view !== undefined) {
    assertPreparedKnowledgeGraphView(props.view, props.presentation);
  }
  const nodes = props.view?.nodes ?? props.presentation.nodes;
  const edges = props.view?.edges ?? props.presentation.edges;
  assertKnowledgeGraphLiveForceBudget(nodes.length, edges.length);
  return renderKnowledgeGraph3DScene(props);
}

function renderKnowledgeGraph3DScene(props: KnowledgeGraph3DSceneSurfaceProps) {
  const { presentation, view, ...interactionProps } = props;
  assertPreparedKnowledgeGraphPresentation(presentation);
  if (view !== undefined) assertPreparedKnowledgeGraphView(view, presentation);
  const { graphIdentity } = presentation;
  const nodes = view?.nodes ?? presentation.nodes;
  const edges = view?.edges ?? presentation.edges;
  const selectedId = view !== undefined && props.selectedId !== null &&
      !knowledgeGraphViewContainsNode(view, presentation, props.selectedId)
    ? null
    : props.selectedId;
  const hoverId = view !== undefined && props.hoverId !== null &&
      !knowledgeGraphViewContainsNode(view, presentation, props.hoverId)
    ? null
    : props.hoverId;
  assertKnowledgeGraphIdentity(graphIdentity);
  assertKnowledgeGraphNodeReference(props.selectedId, 'knowledge-graph selected id');
  assertKnowledgeGraphNodeReference(props.hoverId, 'knowledge-graph hover id');
  assertKnowledgeGraphColor(props.labelColor, 'knowledge-graph label color');
  assertKnowledgeGraphColor(props.particleColor, 'knowledge-graph particle color');
  // Preparation already detached, validated, and froze every record. Public
  // surfaces only check the O(1) capability identity and consume the same bytes.
  // React's key boundary atomically remounts every position/camera/simulation ref
  // for a different declared graph namespace, while preserving same-key views.
  return (
    <KnowledgeGraph3DSceneInstance
      key={graphIdentity}
      {...interactionProps}
      selectedId={selectedId}
      hoverId={hoverId}
      autoFrame={nodes.length > 0 ? props.autoFrame : false}
      graphIdentity={graphIdentity}
      nodes={nodes}
      edges={edges}
    />
  );
}

function KnowledgeGraph3DSceneInstance({
  graphIdentity,
  nodes,
  edges,
  selectedId,
  query,
  onSelect,
  hoverId,
  onHover,
  controlsRef,
  autoFrame = false,
  flyToSelection = false,
  labelColor,
  particleColor,
  themeMode = 'dark',
  reducedMotion = false,
}: KnowledgeGraph3DSceneInstanceProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const particlesRef = useRef<THREE.InstancedMesh>(null);
  const arrowsRef = useRef<THREE.InstancedMesh>(null);
  const sphereGlyphsRef = useRef<THREE.InstancedMesh>(null);
  const boxGlyphsRef = useRef<THREE.InstancedMesh>(null);
  const diamondGlyphsRef = useRef<THREE.InstancedMesh>(null);
  const labelSpriteRef = useRef<THREE.Sprite>(null);
  const sceneGroupRef = useRef<THREE.Group>(null);
  const camera = useThree(selectCamera);
  const gl = useThree(selectRenderer);
  const invalidate = useThree(selectInvalidate);
  const cameraProjectionKind = knowledgeGraphCameraProjectionKind(camera);
  const perspectiveCamera = camera as THREE.PerspectiveCamera;
  const orthographicCamera = camera as THREE.OrthographicCamera;
  const resolvedLabelColor = labelColor ?? (
    themeMode === 'light' ? '#0f172a' : '#e2e8f0'
  );
  const resolvedParticleColor = particleColor ?? (
    themeMode === 'light' ? '#0369a1' : '#8fd3ff'
  );
  const resolvedGlyphColor = themeMode === 'light' ? '#0f172a' : '#f8fafc';
  useEffect(() => {
    if (autoFrame && cameraProjectionKind === null) {
      devWarn(
        'knowledge-graph auto-frame supports only perspective and orthographic cameras',
      );
    }
  }, [autoFrame, cameraProjectionKind]);

  // The exported keyed wrapper remounts this instance for a different declared
  // graph namespace, so these refs persist only across same-key filters/views.
  const [posMap] = useState(() => ({
    current: new Map<string, GraphLayoutPosition>(),
  }));
  const readyGraphKeyRef = useRef<string | null>(null);
  // 0 = initial fit pending, 1 = provisional seed fit done, 2 = final/canceled.
  const autoFrameStageRef = useRef<0 | 1 | 2>(0);
  // The currently-selected node id the camera is easing toward (live-tracked, so
  // the pivot follows the node as the layout settles — not a stale snapshot).
  const flyToIdRef = useRef<string | null>(null);
  const onHoverRef = useRef(onHover);
  const hoverIdRef = useRef(hoverId);
  useLayoutEffect(() => {
    onHoverRef.current = onHover;
    hoverIdRef.current = hoverId;
  }, [onHover, hoverId]);
  useEffect(() => () => {
    if (hoverIdRef.current === null) return;
    hoverIdRef.current = null;
    onHoverRef.current(null);
  }, []);

  // User grab ('start' from the host's controls: drag/zoom begin) cancels any
  // scene-driven camera intent — the pending one-time auto-frame and an
  // in-flight fly-to — so the camera never fights the user's hand. Attached
  // lazily in useFrame (hosts may mount controls after the scene) and
  // re-attached if the controls instance swaps.
  const attachedControlsRef = useRef<ControlsHandle | null>(null);
  const [onUserGrab] = useState(
    () => () => {
      autoFrameStageRef.current = 2;
      flyToIdRef.current = null;
    },
  );
  useEffect(
    () => () => {
      synchronizeKnowledgeGraphControlsListener(
        attachedControlsRef,
        null,
        onUserGrab,
      );
    },
    [onUserGrab],
  );

  // Content signature of the graph: the simulation memo below is keyed on THIS,
  // not on array identity, so a host that rebuilds nodes/edges every render (the
  // common React pattern) never restarts a settled layout. Any renderer-relevant
  // change — structure, radius, edge styling — still yields a new key (warm restart).
  const layoutInput = useMemo(
    () => snapshotGraphLayoutInputs(nodes, edges),
    [nodes, edges],
  );
  const graphKey = layoutInput.graphKey;
  const normalizedQuery = useMemo(() => normalizeGraphQuery(query), [query]);
  const queryMatchIds = useMemo(
    () => graphQueryMatchIds(nodes, normalizedQuery, edges),
    [nodes, normalizedQuery, edges],
  );
  const queryActive = normalizedQuery.length > 0;
  const visualNodes = useMemo(
    () => nodes.map(({ id, label, color, nodeGlyph }) => ({
      id,
      label,
      color: knowledgeGraphContrastSafeColor(color, themeMode),
      nodeGlyph: nodeGlyph ?? 'sphere_outline',
    })),
    [nodes, themeMode],
  );
  const glyphNodeIndexes = useMemo(() => ({
    sphere: visualNodes.flatMap((node, index) =>
      node.nodeGlyph === 'sphere_outline' ? [index] : []),
    box: visualNodes.flatMap((node, index) =>
      node.nodeGlyph === 'box_shell' ? [index] : []),
    diamond: visualNodes.flatMap((node, index) =>
      node.nodeGlyph === 'diamond_shell' ? [index] : []),
  }), [visualNodes]);

  // Build immutable layout inputs, the fast id→index map, and the VALID edge set
  // (both endpoints present, no self-loops) shared by every render path. This
  // render-phase memo never reads or writes the persistent position ref. The
  // committed simulation effect derives a detached warm-start plan from it.
  const { layoutNodes, simLinks, validEdges, edgeLanes, index } = useMemo(() => {
    const index = new Map<string, number>();
    const layoutNodes = layoutInput.nodes.map((n, i) => {
      index.set(n.id, i);
      return { id: n.id, radius: n.radius };
    });
    // One valid-edge set for ALL paths (layout, adjacency, buffers, endpoints,
    // particles, emphasis) so their element counts can never disagree. Direct
    // inputs already failed closed above; the filter remains defensive/shared.
    const validEdges = filterGraphEdges(new Set(index.keys()), layoutInput.edges);
    const edgeLanes = assignGraphEdgeLanes(validEdges);
    const simLinks = uniqueGraphTopologyLinks(validEdges);
    return { layoutNodes, simLinks, validEdges, edgeLanes, index };
    // Keyed on content, not identity: content-equal snapshots are interchangeable
    // everywhere these outputs flow (graphSignature covers every field they use).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphKey]);

  // Visible-edge adjacency (valid edges only), for hover/selection emphasis.
  const neighbors = useMemo(
    () => buildAdjacency(new Set(index.keys()), validEdges),
    [index, validEdges],
  );

  // Scope cursor ownership to this Canvas instead of mutating document.body
  // (SSR-safe and correct when a page has multiple canvases).
  useEffect(() => {
    if (hoverId == null || !index.has(hoverId)) return;
    const element = gl.domElement;
    const previous = element.style.cursor;
    element.style.cursor = 'pointer';
    return () => {
      element.style.cursor = previous;
    };
  }, [gl, hoverId, index]);

  // The (few) edges that carry animated flow particles.
  const flowEdges = useMemo(
    () => edgeLanes.filter(({ edge }) => edge.particles),
    [edgeLanes],
  );
  const directedEdges = useMemo(
    () => edgeLanes.filter(({ edge }) => edge.directed !== false),
    [edgeLanes],
  );
  const edgeDisplayColors = useMemo(
    () => validEdges.map((edge) =>
      knowledgeGraphContrastSafeColor(edge.color, themeMode)),
    [validEdges, themeMode],
  );
  const particleDistribution = useMemo(
    () => planFlowParticleDistribution(
      flowEdges.length,
      PARTICLES_PER_EDGE,
      MAX_PARTICLES,
    ),
    [flowEdges.length],
  );
  const particleCount = particleDistribution.total;
  useEffect(() => {
    if (flowEdges.length * PARTICLES_PER_EDGE > MAX_PARTICLES) {
      devWarn(
        `KnowledgeGraph3DScene: ${flowEdges.length} flow edges exceed the ` +
          `${MAX_PARTICLES}-particle cap at four markers each; marker density ` +
          'is reduced evenly and every flow edge retains at least one marker.',
      );
    }
  }, [flowEdges.length]);

  const visibleLineSegmentCount = useMemo(
    () => validEdges.reduce((count, edge) => {
      let visible = 0;
      for (let chord = 0; chord < GRAPH_EDGE_CURVE_SEGMENTS; chord++) {
        if (knowledgeGraphEdgeStrokeSegmentVisible(
          edge.edgeStrokePattern ?? 'solid',
          chord,
          GRAPH_EDGE_CURVE_SEGMENTS,
        )) visible++;
      }
      return count + visible;
    }, 0),
    [validEdges],
  );
  // Exact compact buffers contain only visible stroke chords. Hidden mask
  // positions never reach the GPU, avoiding implementation-defined rasterization
  // of zero-length line primitives.
  const linePos = useMemo(
    () => new Float32Array(visibleLineSegmentCount * 6),
    [visibleLineSegmentCount],
  );
  const lineCol = useMemo(
    () => new Float32Array(visibleLineSegmentCount * 6),
    [visibleLineSegmentCount],
  );

  // Declare every continuously streamed GPU attribute before its first frame
  // upload. Colors change only on discrete interaction state and remain static
  // usage; matrices and line positions change while layout/flow/camera work runs.
  useLayoutEffect(() => {
    meshRef.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    sphereGlyphsRef.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    boxGlyphsRef.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    diamondGlyphsRef.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    arrowsRef.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    particlesRef.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const position = linesRef.current?.geometry.getAttribute('position');
    if (position instanceof THREE.BufferAttribute) {
      position.setUsage(THREE.DynamicDrawUsage);
    }
  }, [
    linePos,
    nodes.length,
    directedEdges.length,
    particleCount,
    glyphNodeIndexes.sphere.length,
    glyphNodeIndexes.box.length,
    glyphNodeIndexes.diamond.length,
  ]);

  // (Re)create the 3D force simulation whenever the graph changes.
  const layoutRuntimeRef = useRef<GraphLayoutRuntime | null>(null);
  const layoutTickAccumulatorRef = useRef(0);
  const geometryDirtyRef = useRef(true);
  const flowPhaseRef = useRef(0);
  useEffect(() => {
    // Effects may be replayed by Strict Mode. Every setup therefore receives
    // fresh d3-owned nodes and links; d3 never mutates a memoized render value.
    // Remembered positions are copied into both nodes and unpublished slots.
    const plan = planGraphLayoutCache(
      layoutNodes,
      posMap.current,
      MAX_REMEMBERED_POSITIONS,
    );
    const simNodes = plan.nodes;
    const runtimeLinks: SimLink[] = simLinks.map(({ source, target }) => ({ source, target }));
    const linkForce = forceLink<SimGraphNode>(runtimeLinks)
      .id((d) => d.id)
      .distance(34)
      .strength(0.35);
    // Warm restart: if we already have remembered positions (a filter/toggle on
    // an existing layout), re-heat gently so settled nodes barely move; only a
    // genuinely fresh graph pays the full cold layout.
    const sim = forceSimulation<SimGraphNode>(simNodes, 3)
      .force('charge', forceManyBody().strength(-140).distanceMax(600))
      .force('link', linkForce)
      .force('center', forceCenter(0, 0, 0).strength(0.04))
      .force('collide', forceCollide((d) => {
        const node = d as SimGraphNode;
        const visualNode = visualNodes[index.get(node.id) as number];
        return knowledgeGraphRenderedNodeRadialExtent(
          node.r,
          visualNode.nodeGlyph,
          true,
        ) + 3;
      }).iterations(2))
      .alpha(plan.warmStart ? 0.5 : 1)
      .alphaDecay(0.018)
      .velocityDecay(0.42)
      .stop();
    // Reduced motion: settle the layout synchronously (bounded — alpha decays
    // geometrically) so the graph appears in place instead of swirling into it.
    if (reducedMotion) {
      // A static reduced-motion layout is preferable to a long synchronous
      // "settle" that blocks the main thread. Deterministic seeding already
      // gives a legible starting layout; perform only a small bounded refinement.
      const budget = reducedMotionLayoutTickBudget(simNodes.length, simLinks.length);
      for (let i = 0; i < budget && sim.alpha() > GRAPH_LAYOUT_SETTLED_ALPHA; i++) sim.tick();
      sim.alpha(0);
    }
    const runtime: GraphLayoutRuntime = {
      graphKey,
      reducedMotion,
      sim,
      nodes: simNodes,
      cacheBuffers: plan.cacheBuffers,
      nextCacheBufferIndex: 0,
    };
    // Publish atomically only after the complete simulation is initialized.
    // Until its first actual frame, even a replayed effect cannot poison the
    // persistent cache with placeholders or transient d3 state.
    layoutRuntimeRef.current = runtime;
    layoutTickAccumulatorRef.current = 0;
    geometryDirtyRef.current = true;
    invalidate();
    // The keyed wrapper remounts for a new graph identity. Within this instance,
    // a filter/toggle never yanks the camera the user has positioned.
    return () => {
      sim.stop();
      if (layoutRuntimeRef.current === runtime) layoutRuntimeRef.current = null;
    };
  }, [
    graphKey,
    layoutNodes,
    simLinks,
    visualNodes,
    index,
    reducedMotion,
    invalidate,
  ]);

  // A graph-key or motion-policy change must never expose matrices from the
  // preceding runtime under current click/hover identities. Hide before paint;
  // the first successful current-runtime frame reveals the complete scene.
  useLayoutEffect(() => {
    beginKnowledgeGraphRuntimeTransition(
      readyGraphKeyRef,
      geometryDirtyRef,
      sceneGroupRef.current,
      invalidate,
      () => {
        if (hoverIdRef.current === null) return;
        hoverIdRef.current = null;
        onHoverRef.current(null);
      },
    );
  }, [graphKey, reducedMotion, invalidate]);

  // Emphasis: bake node + link colors on discrete focus/query changes (not per frame).
  const applyEmphasis = useCallback(() => {
    const mesh = meshRef.current;
    const raw = hoverId ?? selectedId;
    // A focus id not present in the current graph is treated as NO focus, so a
    // stale selection never dims the whole graph or pins an empty label.
    const focus = raw != null && index.has(raw) ? raw : null;
    const focusSet = focus ? neighbors.get(focus) : null;
    if (mesh) {
      visualNodes.forEach((n, i) => {
        mesh.setColorAt(i, dim(
          n.color,
          knowledgeGraphNodeEmphasisDimAmount(
            n.id,
            focus,
            focusSet,
            queryActive,
            queryMatchIds,
          ),
          themeMode,
        ));
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    updateKnowledgeGraphGlyphColors(
      sphereGlyphsRef.current,
      glyphNodeIndexes.sphere,
      visualNodes,
      resolvedGlyphColor,
      focus,
      focusSet,
      queryActive,
      queryMatchIds,
      themeMode,
    );
    updateKnowledgeGraphGlyphColors(
      boxGlyphsRef.current,
      glyphNodeIndexes.box,
      visualNodes,
      resolvedGlyphColor,
      focus,
      focusSet,
      queryActive,
      queryMatchIds,
      themeMode,
    );
    updateKnowledgeGraphGlyphColors(
      diamondGlyphsRef.current,
      glyphNodeIndexes.diamond,
      visualNodes,
      resolvedGlyphColor,
      focus,
      focusSet,
      queryActive,
      queryMatchIds,
      themeMode,
    );
    // Link colors: dim edges not incident to the focus node.
    let k = 0;
    for (let edgeIndex = 0; edgeIndex < validEdges.length; edgeIndex++) {
      const e = validEdges[edgeIndex];
      const incident = focus
        ? e.source === focus || e.target === focus
        : graphEdgeMatchesQuery(e.source, e.target, queryMatchIds, normalizedQuery);
      const c = dim(
        edgeDisplayColors[edgeIndex],
        focus === null && !queryActive ? 0 : incident ? 0 : 0.86,
        themeMode,
      );
      for (let chord = 0; chord < GRAPH_EDGE_CURVE_SEGMENTS; chord++) {
        if (!knowledgeGraphEdgeStrokeSegmentVisible(
          e.edgeStrokePattern ?? 'solid',
          chord,
          GRAPH_EDGE_CURVE_SEGMENTS,
        )) continue;
        lineCol[k] = c.r;
        lineCol[k + 1] = c.g;
        lineCol[k + 2] = c.b;
        lineCol[k + 3] = c.r;
        lineCol[k + 4] = c.g;
        lineCol[k + 5] = c.b;
        k += 6;
      }
    }
    const geom = linesRef.current?.geometry;
    const attr = geom?.getAttribute('color') as THREE.BufferAttribute | undefined;
    if (attr) attr.needsUpdate = true;
    const arrows = arrowsRef.current;
    if (arrows) {
      directedEdges.forEach(({ edge }, arrowIndex) => {
        const incident = focus
          ? edge.source === focus || edge.target === focus
          : graphEdgeMatchesQuery(
              edge.source,
              edge.target,
              queryMatchIds,
              normalizedQuery,
            );
        arrows.setColorAt(
          arrowIndex,
          dim(
            edgeDisplayColors[directedEdges[arrowIndex].edgeIndex],
            focus === null && !queryActive ? 0 : incident ? 0 : 0.86,
            themeMode,
          ),
        );
      });
      if (arrows.instanceColor) arrows.instanceColor.needsUpdate = true;
    }
  }, [
    visualNodes,
    glyphNodeIndexes,
    resolvedGlyphColor,
    validEdges,
    directedEdges,
    index,
    neighbors,
    hoverId,
    selectedId,
    queryActive,
    queryMatchIds,
    normalizedQuery,
    lineCol,
    edgeDisplayColors,
    themeMode,
  ]);

  // Bake instance/line colors BEFORE the first paint (useLayoutEffect, not
  // useEffect) so the mesh never shows one frame of default-white spheres — the
  // keyed remount on a node-count change resets instanceColor, so this matters
  // beyond mount.
  useLayoutEffect(() => {
    applyEmphasis();
    geometryDirtyRef.current = true;
    invalidate();
  }, [applyEmphasis, invalidate]);

  // Arm a fly-to when a (present) node is selected; the frame reads its LIVE
  // position so the camera tracks it while the layout settles. Clearing on
  // deselect (or a stale id) stops the camera easing toward a node the user no
  // longer has selected.
  useEffect(() => {
    flyToIdRef.current =
      flyToSelection && selectedId && index.has(selectedId) ? selectedId : null;
    if (flyToIdRef.current) {
      // An explicit selection target outranks both provisional and final whole-
      // graph framing, even if fly-to completes before force settlement.
      autoFrameStageRef.current = 2;
      invalidate();
    }
  }, [graphIdentity, selectedId, index, flyToSelection, invalidate]);

  // The animation loop: settle the sim, stream positions into the GPU buffers,
  // advance flow particles, keep the label pinned, and ease the camera.
  useFrame((_, delta) => {
    const runtime = layoutRuntimeRef.current;
    const mesh = meshRef.current;

    // Keep the user-grab cancel listener bound to the CURRENT controls instance,
    // including empty graph views where no node mesh exists.
    const controls = controlsRef?.current ?? null;
    synchronizeKnowledgeGraphControlsListener(
      attachedControlsRef,
      controls,
      onUserGrab,
    );

    if (
      !runtime ||
      runtime.graphKey !== graphKey ||
      runtime.reducedMotion !== reducedMotion ||
      !mesh
    ) return;
    const sim = runtime.sim;
    const simNodes = runtime.nodes;

    let positionsChanged = geometryDirtyRef.current;
    if (sim.alpha() > GRAPH_LAYOUT_SETTLED_ALPHA) {
      const advanced = advanceGraphLayoutClockInto(
        layoutTickAccumulatorRef.current,
        delta,
        _layoutClockResult,
      );
      layoutTickAccumulatorRef.current = advanced.remainderSeconds;
      for (
        let tick = 0;
        tick < advanced.ticks && sim.alpha() > GRAPH_LAYOUT_SETTLED_ALPHA;
        tick++
      ) {
        sim.tick();
        positionsChanged = true;
      }
    } else {
      layoutTickAccumulatorRef.current = 0;
    }

    // Node instance matrices + remember positions (mutated in place — no alloc).
    const raw = hoverId ?? selectedId;
    const focus = raw != null && index.has(raw) ? raw : null;
    const focusSet = focus ? neighbors.get(focus) : null;
    const completedCacheBufferIndex = runtime.nextCacheBufferIndex;
    if (positionsChanged) {
      // From the first CPU geometry mutation until final publication, neither
      // raycasting nor the visible scene may claim current-runtime readiness.
      // This also leaves a failed later tick safely hidden and noninteractive.
      geometryDirtyRef.current = true;
      const sceneGroup = sceneGroupRef.current;
      if (sceneGroup) sceneGroup.visible = false;
      const positionSlots = runtime.cacheBuffers[completedCacheBufferIndex].positionSlots;
      _dummy.quaternion.identity();
      for (let i = 0; i < simNodes.length; i++) {
        const n = simNodes[i];
        const x = n.x ?? 0;
        const y = n.y ?? 0;
        const z = n.z ?? 0;
        const remembered = positionSlots[i];
        remembered[0] = x;
        remembered[1] = y;
        remembered[2] = z;
        _dummy.position.set(x, y, z);
        const pop = knowledgeGraphRenderedNodeScale(
          focus !== null && (n.id === focus || focusSet?.has(n.id) === true),
        );
        _dummy.scale.setScalar(n.r * pop);
        _dummy.updateMatrix();
        mesh.setMatrixAt(i, _dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      // Instances moved: drop three's cached bounds so the next hover/click
      // raycast recomputes them — a stale sphere makes drifted nodes unhittable.
      mesh.boundingSphere = null;

      updateKnowledgeGraphGlyphMatrices(
        sphereGlyphsRef.current,
        glyphNodeIndexes.sphere,
        simNodes,
        focus,
        focusSet,
      );
      updateKnowledgeGraphGlyphMatrices(
        boxGlyphsRef.current,
        glyphNodeIndexes.box,
        simNodes,
        focus,
        focusSet,
      );
      updateKnowledgeGraphGlyphMatrices(
        diamondGlyphsRef.current,
        glyphNodeIndexes.diamond,
        simNodes,
        focus,
        focusSet,
      );

      // Routed edge chords (valid edges only, so counts match the buffers exactly).
      let k = 0;
      for (let edgeIndex = 0; edgeIndex < edgeLanes.length; edgeIndex++) {
        const lane = edgeLanes[edgeIndex];
        const e = lane.edge;
        const s = simNodes[index.get(e.source) as number];
        const t = simNodes[index.get(e.target) as number];
        setEdgeCurve(s, t, lane);
        _curvePoint.copy(_a);
        for (let chord = 0; chord < GRAPH_EDGE_CURVE_SEGMENTS; chord++) {
          graphEdgeCurvePointInto(
            _a,
            _curveControl,
            _b,
            (chord + 1) / GRAPH_EDGE_CURVE_SEGMENTS,
            _curveNext,
          );
          const chordVisible = knowledgeGraphEdgeStrokeSegmentVisible(
            e.edgeStrokePattern ?? 'solid',
            chord,
            GRAPH_EDGE_CURVE_SEGMENTS,
          );
          if (chordVisible) {
            linePos[k] = _curvePoint.x;
            linePos[k + 1] = _curvePoint.y;
            linePos[k + 2] = _curvePoint.z;
            linePos[k + 3] = _curveNext.x;
            linePos[k + 4] = _curveNext.y;
            linePos[k + 5] = _curveNext.z;
            k += 6;
          }
          _curvePoint.copy(_curveNext);
        }
      }
      const posAttr = linesRef.current?.geometry.getAttribute('position') as
        | THREE.BufferAttribute
        | undefined;
      if (posAttr) posAttr.needsUpdate = true;

      // Persistent arrowheads encode edge direction without relying on motion.
      // This remains legible under prefers-reduced-motion and in screenshots.
      const arrows = arrowsRef.current;
      if (arrows) {
        for (let i = 0; i < directedEdges.length; i++) {
          const lane = directedEdges[i];
          const edge = lane.edge;
          const source = simNodes[index.get(edge.source) as number];
          const targetIndex = index.get(edge.target) as number;
          const target = simNodes[targetIndex];
          setEdgeCurve(source, target, lane);
          const targetExtent = knowledgeGraphRenderedNodeRadialExtent(
            target.r,
            visualNodes[targetIndex].nodeGlyph,
            focus !== null && (
              target.id === focus || focusSet?.has(target.id) === true
            ),
          );
          if (!graphEdgeTargetBoundaryInto(
            _a,
            _curveControl,
            _b,
            targetExtent,
            _curveNext,
            _direction,
          )) {
            _dummy.position.copy(_b);
            _dummy.quaternion.identity();
            _dummy.scale.setScalar(0);
          } else {
            _dummy.position
              .copy(_curveNext)
              .addScaledVector(
                _direction,
                -KNOWLEDGE_GRAPH_DIRECTION_MARKER_LENGTH / 2,
              );
            _dummy.quaternion.setFromUnitVectors(_up, _direction);
            _dummy.scale.set(
              1.25,
              KNOWLEDGE_GRAPH_DIRECTION_MARKER_LENGTH,
              1.25,
            );
          }
          _dummy.updateMatrix();
          arrows.setMatrixAt(i, _dummy.matrix);
        }
        arrows.instanceMatrix.needsUpdate = true;
        arrows.boundingSphere = null;
      }
    }

    // Citation flow particles gliding along their edges.
    const pmesh = particlesRef.current;
    if (pmesh && particleCount > 0 && (positionsChanged || !reducedMotion)) {
      _dummy.quaternion.identity();
      // Reduced motion: hold markers at strictly interior curve parameters.
      // Layout geometry can still occlude a marker; direction remains redundant
      // in the arrowhead and DOM relationship text.
      if (!reducedMotion) {
        flowPhaseRef.current = advanceKnowledgeGraphFlowPhase(
          flowPhaseRef.current,
          delta,
        );
      }
      const base = reducedMotion ? 0 : flowPhaseRef.current;
      let p = 0;
      for (let fe = 0; fe < flowEdges.length && p < particleCount; fe++) {
        const lane = flowEdges[fe];
        const e = lane.edge;
        const s = simNodes[index.get(e.source) as number];
        const t = simNodes[index.get(e.target) as number];
        setEdgeCurve(s, t, lane);
        // Focus/query-dimmed edges collapse their particles to zero size so the
        // subdued periphery does not keep sparkling through the emphasis state.
        const queryIncident = graphEdgeMatchesQuery(
          e.source,
          e.target,
          queryMatchIds,
          normalizedQuery,
        );
        let size = 1.3;
        if (focus) {
          if (e.source !== focus && e.target !== focus) size = 0;
        } else if (!queryIncident) {
          size = 0;
        }
        // Golden-ratio phase per edge — flows don't pulse in lockstep.
        const phase = fe * 0.618034;
        const edgeParticleCount = particleDistribution.basePerEdge +
          (fe < particleDistribution.extraEdgeCount ? 1 : 0);
        for (let q = 0; q < edgeParticleCount && p < particleCount; q++) {
          const frac = reducedMotion
            ? reducedMotionFlowParticleFraction(q, edgeParticleCount)
            : (base + phase + q / edgeParticleCount) % 1;
          graphEdgeCurvePointInto(_a, _curveControl, _b, frac, _dummy.position);
          _dummy.scale.setScalar(size);
          _dummy.updateMatrix();
          pmesh.setMatrixAt(p, _dummy.matrix);
          p++;
        }
      }
      pmesh.instanceMatrix.needsUpdate = true;
    }

    // One floating label follows the focus node. The Sprite remains anchored at
    // the node and its camera-facing center creates a bounded world-unit offset,
    // so later auto-frame/control camera mutations cannot stale its direction.
    const label = labelSpriteRef.current;
    if (label) {
      const fi = focus != null ? index.get(focus) : undefined;
      if (fi != null) {
        const n = simNodes[fi];
        label.position.set(n.x ?? 0, n.y ?? 0, n.z ?? 0);
        label.center.set(
          0.5,
          knowledgeGraphFocusLabelSpriteCenterY(
            n.r,
            visualNodes[fi].nodeGlyph,
          ),
        );
        label.visible = true;
      } else {
        label.visible = false;
      }
    }

    // Frame the deterministic seed immediately so first paint is usable, then
    // correct once after force settlement. A user grab cancels the final fit.
    const layoutSettled = sim.alpha() <= GRAPH_LAYOUT_SETTLED_ALPHA;
    if (
      autoFrame &&
      autoFrameStageRef.current < 2 &&
      (autoFrameStageRef.current === 0 || layoutSettled) &&
      simNodes.length > 0 &&
      cameraProjectionKind !== null
    ) {
      const cameraParentIdentity = isKnowledgeGraphCameraParentChainIdentity(
        camera.parent,
      );
      const cameraSelfTransformCanonical =
        isKnowledgeGraphCameraSelfTransformCanonical(camera);
      const cameraMethodsCanonical =
        camera.getWorldDirection === THREE.Camera.prototype.getWorldDirection &&
        camera.lookAt === THREE.Object3D.prototype.lookAt &&
        camera.updateMatrixWorld === THREE.Camera.prototype.updateMatrixWorld &&
        camera.updateWorldMatrix === THREE.Camera.prototype.updateWorldMatrix;
      let centeredProjectionSupported = false;
      if (cameraProjectionKind === 'perspective') {
        _perspectiveAutoFrameProjection.isArrayCamera =
          (camera as THREE.ArrayCamera).isArrayCamera === true;
        _perspectiveAutoFrameProjection.viewEnabled =
          perspectiveCamera.view?.enabled === true;
        _perspectiveAutoFrameProjection.parentTransformIdentity = cameraParentIdentity;
        _perspectiveAutoFrameProjection.selfTransformCanonical =
          cameraSelfTransformCanonical;
        _perspectiveAutoFrameProjection.cameraMethodsCanonical = cameraMethodsCanonical;
        _perspectiveAutoFrameProjection.projectionMethodCanonical =
          camera.updateProjectionMatrix ===
            THREE.PerspectiveCamera.prototype.updateProjectionMatrix;
        _perspectiveAutoFrameProjection.effectiveFovMethodCanonical =
          perspectiveCamera.getEffectiveFOV ===
            THREE.PerspectiveCamera.prototype.getEffectiveFOV;
        _perspectiveAutoFrameProjection.webGlCoordinateSystem =
          camera.coordinateSystem === THREE.WebGLCoordinateSystem;
        _perspectiveAutoFrameProjection.fovDegrees = perspectiveCamera.fov;
        _perspectiveAutoFrameProjection.aspect = perspectiveCamera.aspect;
        _perspectiveAutoFrameProjection.zoom = perspectiveCamera.zoom;
        _perspectiveAutoFrameProjection.near = perspectiveCamera.near;
        _perspectiveAutoFrameProjection.far = perspectiveCamera.far;
        _perspectiveAutoFrameProjection.filmOffset = perspectiveCamera.filmOffset;
        _perspectiveAutoFrameProjection.projectionMatrixElements =
          perspectiveCamera.projectionMatrix.elements;
        centeredProjectionSupported =
          isKnowledgeGraphCenteredAutoFrameProjectionSupported(
            _perspectiveAutoFrameProjection,
          );
      } else {
        _orthographicAutoFrameProjection.isArrayCamera =
          (camera as THREE.ArrayCamera).isArrayCamera === true;
        _orthographicAutoFrameProjection.viewEnabled =
          orthographicCamera.view?.enabled === true;
        _orthographicAutoFrameProjection.parentTransformIdentity = cameraParentIdentity;
        _orthographicAutoFrameProjection.selfTransformCanonical =
          cameraSelfTransformCanonical;
        _orthographicAutoFrameProjection.cameraMethodsCanonical = cameraMethodsCanonical;
        _orthographicAutoFrameProjection.projectionMethodCanonical =
          camera.updateProjectionMatrix ===
            THREE.OrthographicCamera.prototype.updateProjectionMatrix;
        _orthographicAutoFrameProjection.webGlCoordinateSystem =
          camera.coordinateSystem === THREE.WebGLCoordinateSystem;
        _orthographicAutoFrameProjection.left = orthographicCamera.left;
        _orthographicAutoFrameProjection.right = orthographicCamera.right;
        _orthographicAutoFrameProjection.top = orthographicCamera.top;
        _orthographicAutoFrameProjection.bottom = orthographicCamera.bottom;
        _orthographicAutoFrameProjection.zoom = orthographicCamera.zoom;
        _orthographicAutoFrameProjection.near = orthographicCamera.near;
        _orthographicAutoFrameProjection.far = orthographicCamera.far;
        _orthographicAutoFrameProjection.projectionMatrixElements =
          orthographicCamera.projectionMatrix.elements;
        centeredProjectionSupported =
          isKnowledgeGraphCenteredAutoFrameProjectionSupported(
            _orthographicAutoFrameProjection,
          );
      }
      const perspectiveFov = centeredProjectionSupported &&
          cameraProjectionKind === 'perspective'
        ? perspectiveCamera.getEffectiveFOV()
        : 0;
      const horizontalSpan = cameraProjectionKind === 'orthographic'
        ? Math.abs(orthographicCamera.right - orthographicCamera.left)
        : 0;
      const verticalSpan = cameraProjectionKind === 'orthographic'
        ? Math.abs(orthographicCamera.top - orthographicCamera.bottom)
        : 0;
      const projectionReady = centeredProjectionSupported && (
        cameraProjectionKind === 'perspective'
        ? isKnowledgeGraphPerspectiveProjectionReady(
            perspectiveFov,
            perspectiveCamera.aspect,
          )
        : isKnowledgeGraphOrthographicProjectionReady(
            horizontalSpan,
            verticalSpan,
            orthographicCamera.zoom,
          )
      );
      const cameraPositionReady = isKnowledgeGraphCameraVectorFinite(
        camera.position.x,
        camera.position.y,
        camera.position.z,
      );
      const controlsTargetReady = controls === null ||
        isKnowledgeGraphCameraVectorFinite(
          controls.target.x,
          controls.target.y,
          controls.target.z,
        );
      if (projectionReady && cameraPositionReady && controlsTargetReady) {
        _box.makeEmpty();
        for (let nodeIndex = 0; nodeIndex < simNodes.length; nodeIndex++) {
          const n = simNodes[nodeIndex];
          // Whole-graph framing follows geometry rendered on this frame. Reserving
          // the maximum hypothetical label around every node makes a small graph
          // unreadable; labels belong only to the active focus/fly-to interaction.
          // A later hover never restarts either one-shot whole-graph fit stage.
          const glyph = visualNodes[nodeIndex].nodeGlyph;
          const radius = knowledgeGraphAutoFrameNodeRadialExtent(
            n.r,
            glyph,
            visualNodes[nodeIndex].id === focus,
          );
          _box.expandByPoint(_a.set(
            (n.x ?? 0) - radius,
            (n.y ?? 0) - radius,
            (n.z ?? 0) - radius,
          ));
          _box.expandByPoint(_b.set(
            (n.x ?? 0) + radius,
            (n.y ?? 0) + radius,
            (n.z ?? 0) + radius,
          ));
        }
        if (validEdges.length > 0) {
          _box.expandByScalar(
            MAX_GRAPH_EDGE_LANE_OFFSET + GRAPH_DIRECTION_MARKER_PADDING,
          );
        }
        const sphere = _box.getBoundingSphere(_sphere);
        const currentDistance = controls
          ? camera.position.distanceTo(controls.target)
          : camera.position.distanceTo(sphere.center);
        if (controls && camera.position.distanceToSquared(controls.target) > 1e-12) {
          _direction.copy(camera.position).sub(controls.target).normalize();
        } else {
          camera.getWorldDirection(_direction).multiplyScalar(-1);
        }
        const directionReady = isKnowledgeGraphCameraVectorFinite(
          _direction.x,
          _direction.y,
          _direction.z,
        );
        if (directionReady) {
          if (_direction.lengthSq() <= 1e-12) _direction.set(0, 0, 1);
          else _direction.normalize();
          const fit = cameraProjectionKind === 'orthographic'
            ? planKnowledgeGraphOrthographicCameraFitInto(
                sphere.radius,
                currentDistance,
                horizontalSpan,
                verticalSpan,
                orthographicCamera.zoom,
                _cameraFitResult,
              )
            : planKnowledgeGraphPerspectiveCameraFitInto(
                sphere.radius,
                currentDistance,
                perspectiveFov,
                perspectiveCamera.aspect,
                _cameraFitResult,
              );
          camera.position.copy(sphere.center).addScaledVector(_direction, fit.distance);
          if (
            cameraProjectionKind === 'orthographic' &&
            fit.orthographicZoom !== undefined
          ) {
            orthographicCamera.zoom = fit.orthographicZoom;
          }
          const projected = camera as
            THREE.PerspectiveCamera | THREE.OrthographicCamera;
          const clipping = planKnowledgeGraphCameraClippingInto(
            cameraProjectionKind,
            projected.near,
            projected.far,
            fit.distance,
            sphere.radius,
            _cameraClippingResult,
          );
          projected.near = clipping.near;
          projected.far = clipping.far;
          projected.updateProjectionMatrix();
          if (controls) {
            controls.target.copy(sphere.center);
            controls.update();
          } else {
            camera.lookAt(sphere.center);
            camera.updateMatrixWorld();
          }
          // A throwing host control remains retryable; user grabs still cancel
          // eagerly because user intent, unlike programmatic framing, is final.
          autoFrameStageRef.current = layoutSettled ? 2 : 1;
        }
      }
    }

    // Ease the camera target toward the selected node's LIVE position.
    if (flyToIdRef.current) {
      const fi = index.get(flyToIdRef.current);
      if (fi == null) {
        flyToIdRef.current = null; // selected node left the graph
      } else if (controls) {
        const n = simNodes[fi];
        _a.set(n.x ?? 0, n.y ?? 0, n.z ?? 0);
        // Reduced motion: snap the pivot instead of easing it.
        controls.target.lerp(_a, graphCameraTargetDamping(delta, reducedMotion));
        controls.update();
        if (controls.target.distanceTo(_a) < 0.5) flyToIdRef.current = null;
      } else {
        flyToIdRef.current = null; // no controls to move — drop the stale intent
      }
    }

    if (
      sim.alpha() > GRAPH_LAYOUT_SETTLED_ALPHA ||
      (!reducedMotion && particleCount > 0) ||
      flyToIdRef.current !== null
    ) {
      invalidate();
    }
    // Do not publish remembered-position authority until every potentially
    // throwing simulation and CPU-side matrix/buffer, particle, label, camera,
    // controls, and invalidation step in this callback has completed. R3F submits
    // the actual GPU render only after subscribers return, so this deliberately
    // makes no claim about upload, shader, or draw success.
    if (positionsChanged) {
      publishGraphLayoutCache(posMap, runtime, completedCacheBufferIndex);
      geometryDirtyRef.current = false;
      readyGraphKeyRef.current = graphKey;
      const group = sceneGroupRef.current;
      if (group) group.visible = true;
    }
  });

  const focusLabelId = hoverId ?? selectedId;
  const focusLabelIndex =
    focusLabelId != null && index.has(focusLabelId)
      ? index.get(focusLabelId)
      : undefined;
  const focusLabel = focusLabelIndex == null
    ? ''
    : visualNodes[focusLabelIndex]?.label ?? '';

  const handleMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const runtime = layoutRuntimeRef.current;
      if (
        readyGraphKeyRef.current !== graphKey ||
        geometryDirtyRef.current ||
        runtime?.graphKey !== graphKey ||
        runtime.reducedMotion !== reducedMotion
      ) return;
      if (!isKnowledgeGraphInstanceId(e.instanceId, visualNodes.length)) return;
      // Three raycasting does not skip invisible ancestors. An unready mesh must
      // not swallow events intended for another scene object.
      e.stopPropagation();
      const id = visualNodes[e.instanceId].id;
      // Fire only on CHANGE — pointermove is per-frame, and an unguarded call
      // would re-render a state-holding host on every mouse twitch.
      if (id !== hoverIdRef.current) {
        hoverIdRef.current = id;
        onHoverRef.current(id);
      }
    },
    [graphKey, reducedMotion, visualNodes],
  );
  const handleOut = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const runtime = layoutRuntimeRef.current;
      const ready = !(
        readyGraphKeyRef.current !== graphKey ||
        geometryDirtyRef.current ||
        runtime?.graphKey !== graphKey ||
        runtime.reducedMotion !== reducedMotion
      );
      handleKnowledgeGraphPointerOut(
        ready,
        () => e.stopPropagation(),
        () => {
          if (hoverIdRef.current === null) return;
          hoverIdRef.current = null;
          onHoverRef.current(null);
        },
      );
    },
    [graphKey, reducedMotion],
  );
  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      const runtime = layoutRuntimeRef.current;
      const ready = !(
        readyGraphKeyRef.current !== graphKey ||
        geometryDirtyRef.current ||
        runtime?.graphKey !== graphKey ||
        runtime.reducedMotion !== reducedMotion
      );
      handleKnowledgeGraphNodeClick(
        ready,
        e.instanceId,
        visualNodes.length,
        e.delta,
        () => e.stopPropagation(),
        (instanceId) => {
          const id = visualNodes[instanceId].id;
          onSelect(toggledKnowledgeGraphSelection(selectedId, id));
        },
      );
    },
    [graphKey, reducedMotion, visualNodes, onSelect, selectedId],
  );

  return (
    <>
      <group key={`graph-${graphKey}`} ref={sceneGroupRef} visible={false}>
      {/* Nodes — one instanced, unlit sphere per record.
          frustumCulled off: instance matrices stream every frame, and three's
          once-cached bounding sphere would blink drifted nodes out mid-orbit.
          Rendered only when non-empty so an empty graph shows no phantom instance. */}
      {nodes.length > 0 ? (
        <instancedMesh
          key={`nodes-${nodes.length}`}
          ref={meshRef}
          args={[undefined, undefined, nodes.length]}
          frustumCulled={false}
          onPointerMove={handleMove}
          onPointerOut={handleOut}
          onClick={handleClick}
        >
          <sphereGeometry args={[1, 20, 20]} />
          {/* Unlit: per-instance color IS the emissive bloom source. */}
          <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
      ) : null}

      {/* A closed, high-contrast glyph channel makes node kind independent of
          hue. The three groups partition nodes, so their total instance count is
          bounded by the already-validated node count. They never raycast. */}
      {glyphNodeIndexes.sphere.length > 0 ? (
        <instancedMesh
          ref={sphereGlyphsRef}
          args={[undefined, undefined, glyphNodeIndexes.sphere.length]}
          frustumCulled={false}
          raycast={disableKnowledgeGraphGlyphRaycast}
        >
          <sphereGeometry args={[
            KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE.sphere_outline,
            12,
            12,
          ]} />
          <meshBasicMaterial
            color="#ffffff"
            wireframe
            toneMapped={false}
          />
        </instancedMesh>
      ) : null}
      {glyphNodeIndexes.box.length > 0 ? (
        <instancedMesh
          ref={boxGlyphsRef}
          args={[undefined, undefined, glyphNodeIndexes.box.length]}
          frustumCulled={false}
          raycast={disableKnowledgeGraphGlyphRaycast}
        >
          <boxGeometry args={[
            KNOWLEDGE_GRAPH_BOX_SHELL_SIDE,
            KNOWLEDGE_GRAPH_BOX_SHELL_SIDE,
            KNOWLEDGE_GRAPH_BOX_SHELL_SIDE,
            1,
            1,
            1,
          ]} />
          <meshBasicMaterial
            color="#ffffff"
            wireframe
            toneMapped={false}
          />
        </instancedMesh>
      ) : null}
      {glyphNodeIndexes.diamond.length > 0 ? (
        <instancedMesh
          ref={diamondGlyphsRef}
          args={[undefined, undefined, glyphNodeIndexes.diamond.length]}
          frustumCulled={false}
          raycast={disableKnowledgeGraphGlyphRaycast}
        >
          <octahedronGeometry args={[
            KNOWLEDGE_GRAPH_NODE_GLYPH_RADIAL_SCALE.diamond_shell,
            0,
          ]} />
          <meshBasicMaterial
            color="#ffffff"
            wireframe
            toneMapped={false}
          />
        </instancedMesh>
      ) : null}

      {/* Edges — theme-aware line segments (culling off: positions stream
          every frame, so the once-cached geometry bounds go stale). */}
      <lineSegments key={`lines-${validEdges.length}`} ref={linesRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePos, 3]} />
          <bufferAttribute attach="attributes-color" args={[lineCol, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          vertexColors
          toneMapped={false}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </lineSegments>

      {/* Direction is structural evidence, so every directed edge gets a static
          arrowhead; animation is only a redundant cue for citation flow. */}
      {directedEdges.length > 0 ? (
        <instancedMesh
          key={`arrows-${directedEdges.length}`}
          ref={arrowsRef}
          args={[undefined, undefined, directedEdges.length]}
          frustumCulled={false}
        >
          <coneGeometry args={[1, 1, 8]} />
          <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
      ) : null}

      {/* Citation flow particles. */}
      {particleCount > 0 ? (
        <instancedMesh
          key={`p-${particleCount}`}
          ref={particlesRef}
          args={[undefined, undefined, particleCount]}
          frustumCulled={false}
        >
          <sphereGeometry args={[0.6, 6, 6]} />
          <meshBasicMaterial
            color={resolvedParticleColor}
            toneMapped={false}
            transparent
            opacity={0.9}
            depthWrite={false}
            blending={themeMode === 'light'
              ? THREE.NormalBlending
              : THREE.AdditiveBlending}
          />
        </instancedMesh>
      ) : null}

      {/* Floating label for the focused node. */}
      <FocusLabelSprite
        spriteRef={labelSpriteRef}
        text={focusLabel}
        color={resolvedLabelColor}
        themeMode={themeMode}
        invalidate={invalidate}
      />
      </group>
    </>
  );
}

export * from './knowledgeGraph';
export * from './knowledgeGraphFigure';
export * from './KnowledgeGraphA11yList';
export * from './KnowledgeGraphStaticRecordView';
export * from './KnowledgeGraphAccessibleFigure';
export {
  KNOWLEDGE_GRAPH_PRESENTATION_INPUT_V1,
  PREPARED_KNOWLEDGE_GRAPH_PRESENTATION_V1,
  PREPARED_KNOWLEDGE_GRAPH_VIEW_V1,
  KnowledgeGraphPresentationJsonError,
  assertPreparedKnowledgeGraphView,
  assertPreparedKnowledgeGraphPresentation,
  isPreparedKnowledgeGraphPresentation,
  isPreparedKnowledgeGraphView,
  knowledgeGraphPresentationContainsNode,
  knowledgeGraphViewContainsNode,
  parseKnowledgeGraphPresentationJson,
  prepareKnowledgeGraphPresentation,
  prepareKnowledgeGraphView,
  serializePreparedKnowledgeGraphPresentation,
  type KnowledgeGraphPresentationBudgetReceiptV1,
  type KnowledgeGraphPresentationInputAssuranceV1,
  type KnowledgeGraphPresentationInputV1,
  type KnowledgeGraphViewPolicyV1,
  type PreparedKnowledgeGraphPresentationV1,
  type PreparedKnowledgeGraphViewV1,
} from './knowledgeGraphPresentation.internal';
