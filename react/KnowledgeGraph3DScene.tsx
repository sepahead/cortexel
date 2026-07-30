// KnowledgeGraph3DScene — a Canvas-less, host-agnostic 3D corpus-knowledge-graph
// scene primitive (Design Law #5: the library renders ONLY scene contents; the
// host owns <Canvas>, OrbitControls, bloom, background, fog and Stars).
//
// It draws abstract KnowledgeGraph3DNode / KnowledgeGraph3DEdge records — each
// carrying its own precomputed color, radius and kind — so the same renderer
// draws a paper graph or a multi-type entity graph (papers + models + families)
// with zero renderer changes. The caller owns all domain→visual mapping — use
// `mapCorpusKnowledgeGraph` (this subpath) to turn validated corpus.knowledge_graph
// params + a palette into these records.
//
// Design (follows the R3F best-practices skill):
//   • The d3-force-3d simulation is ticked inside useFrame and its positions are
//     written straight into the instanced matrix / line buffers via refs — NEVER
//     through React state (no per-frame re-renders).
//   • React state changes only on discrete events (hover id, selection) and
//     drive the emphasis recolor + the single floating label, not the loop.
//   • Nodes are one instancedMesh (unlit, additively-bloomed spheres); edges are
//     one additive lineSegments; citation flow is one instanced particle cloud.
//   • useFrame is allocation-free — module-scope scratch objects only.
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
  assertKnowledgeGraphBudget,
  assertKnowledgeGraphIdentity,
  assertRenderableGraphEdges,
  assertUniqueGraphNodeIds,
  buildAdjacency,
  filterGraphEdges,
  GRAPH_EDGE_CURVE_SEGMENTS,
  graphEdgeControlPointInto,
  graphEdgeCurvePointInto,
  graphEdgeMatchesQuery,
  graphCameraTargetDamping,
  graphQueryMatchIds,
  MAX_KNOWLEDGE_GRAPH_SCENE_EDGES,
  normalizeGraphQuery,
  reducedMotionLayoutTickBudget,
  uniqueGraphTopologyLinks,
  type KnowledgeGraphAttributes,
  type KnowledgeGraphEpistemic,
  type KnowledgeGraphEvidenceRef,
  type KnowledgeGraphUncalibratedScore,
  type GraphEdgeLane,
} from './knowledgeGraph';
import {
  planGraphLayoutCache,
  publishGraphLayoutCache,
  snapshotGraphLayoutInputs,
  type GraphLayoutCacheBuffer,
  type GraphLayoutNode,
  type GraphLayoutPosition,
} from './knowledgeGraphLayout.internal';
import { installFocusLabelResource } from './focusLabelResource.internal';
import {
  assertKnowledgeGraphColor,
  assertKnowledgeGraphNodeReference,
  snapshotKnowledgeGraphPresentation,
} from './knowledgeGraphPresentation.internal';
import {
  beginKnowledgeGraphRuntimeTransition,
  handleKnowledgeGraphPointerOut,
  synchronizeKnowledgeGraphControlsListener,
} from './knowledgeGraphInteraction.internal';
import { planFlowParticleDistribution } from './knowledgeGraphParticles.internal';
import { safeDiagnosticText } from '../core/safeRuntime';

export interface KnowledgeGraph3DNode {
  readonly id: string;
  readonly label: string;
  readonly detail?: string;
  readonly attributes?: Readonly<KnowledgeGraphAttributes>;
  readonly epistemic?: Readonly<KnowledgeGraphEpistemic>;
  readonly evidence?: readonly KnowledgeGraphEvidenceRef[];
  readonly uncalibrated_score?: Readonly<KnowledgeGraphUncalibratedScore>;
  readonly color: string; // hex string — the node carries its own color (not host palette)
  readonly radius: number; // invalid/out-of-range values fall back to a safe scene radius
  /** Human-readable semantics for radius. Omitted means caller-defined visual size. */
  readonly radiusMeaning?: string;
  readonly kind: string; // 'paper' | 'model' | 'family' | …
}

export interface KnowledgeGraph3DEdge {
  /** Stable assertion identity. Distinct ids may share endpoints and kind. */
  readonly id?: string;
  readonly label?: string;
  readonly attributes?: Readonly<KnowledgeGraphAttributes>;
  readonly epistemic?: Readonly<KnowledgeGraphEpistemic>;
  readonly evidence?: readonly KnowledgeGraphEvidenceRef[];
  readonly uncalibrated_score?: Readonly<KnowledgeGraphUncalibratedScore>;
  readonly source: string;
  readonly target: string;
  readonly color: string; // hex string
  /** Directed edges receive a persistent arrowhead (including reduced motion). */
  readonly directed?: boolean;
  readonly kind: string;
  /** Animate glowing particles flowing source→target (e.g. citations). */
  readonly particles?: boolean;
}

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

export interface KnowledgeGraph3DSceneProps {
  /** Caller-declared graph/snapshot cache namespace. Change it with declared graph
   * context; keep it stable for filters. It is not a content digest or proof. */
  graphIdentity: string;
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
   *  scenes): run a bounded static refinement from the deterministic seed,
   *  hold flow particles still, and snap fly-to instead of easing. */
  reducedMotion?: boolean;
}

const PARTICLES_PER_EDGE = 4;
// The renderer admits at most this many edges. Keeping the particle cap bound to
// the same authority guarantees that every valid all-flow graph retains at least
// one visible flow marker if the scene budget changes in a future revision.
const MAX_PARTICLES = MAX_KNOWLEDGE_GRAPH_SCENE_EDGES;
const FALLBACK_COLOR = '#64748b'; // deterministic fallback for an unparseable hex
// Cap the remembered-position cache so a long session streaming many distinct
// graphs cannot grow it without bound (positions still persist across filter
// toggles below this size — see posMap).
const MAX_REMEMBERED_POSITIONS = 5000;

// Reusable scratch objects — never allocate inside useFrame.
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _dimTarget = new THREE.Color('#030711');
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

// Stable selectors avoid subscribing the complete scene to unrelated R3F store
// updates and avoid manufacturing selector closures on every React render.
const selectCamera = (state: RootState) => state.camera;
const selectRenderer = (state: RootState) => state.gl;
const selectInvalidate = (state: RootState) => state.invalidate;

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
function dim(hex: string, amount: number): THREE.Color {
  _color.set(FALLBACK_COLOR); // reset: a failed .set() below is a no-op
  _color.set(hex);
  return _color.lerp(_dimTarget, amount);
}

/** Network-free focus label. Drei/Troika's default Text path fetches fonts and
 *  unicode data from public CDNs; a CanvasTexture uses the host's system font
 *  and keeps Cortexel's no-implicit-network guarantee intact. GPU resources are
 *  created only after commit so an abandoned concurrent render cannot leak a
 *  texture whose cleanup effect never existed. */
function FocusLabelSprite({
  text,
  color,
  invalidate,
}: {
  text: string;
  color: string;
  invalidate: () => void;
}) {
  const label = safeDiagnosticText(text, 120);
  const spriteRef = useRef<THREE.Sprite>(null);
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
      invalidate,
    });
  }, [label, color, invalidate]);

  return (
    <sprite ref={spriteRef} visible={false}>
      <spriteMaterial
        ref={materialRef}
        transparent
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
 * arrowheads, and flow particles. Module-scope vectors keep useFrame allocation-free. */
function setEdgeCurve(
  source: SimGraphNode,
  target: SimGraphNode,
  lane: Pick<GraphEdgeLane, 'laneOffset' | 'canonicalDirectionSign'>,
): void {
  _a.set(source.x ?? 0, source.y ?? 0, source.z ?? 0);
  _b.set(target.x ?? 0, target.y ?? 0, target.z ?? 0);
  graphEdgeControlPointInto(_a, _b, lane, _curveControl);
}

export function KnowledgeGraph3DScene(props: KnowledgeGraph3DSceneProps) {
  const { graphIdentity, nodes, edges } = props;
  assertKnowledgeGraphIdentity(graphIdentity);
  assertKnowledgeGraphNodeReference(props.selectedId, 'knowledge-graph selected id');
  assertKnowledgeGraphNodeReference(props.hoverId, 'knowledge-graph hover id');
  assertKnowledgeGraphColor(props.labelColor, 'knowledge-graph label color');
  assertKnowledgeGraphColor(props.particleColor, 'knowledge-graph particle color');
  // Reject counts before the bounded deep snapshot does any proportional work.
  assertKnowledgeGraphBudget(nodes.length, edges.length);
  const snapshot = snapshotKnowledgeGraphPresentation(nodes, edges);
  assertUniqueGraphNodeIds(snapshot.nodes);
  assertRenderableGraphEdges(snapshot.nodes, snapshot.edges);
  // React's key boundary atomically remounts every position/camera/simulation ref
  // for a different declared graph namespace, while preserving same-key views.
  return (
    <KnowledgeGraph3DSceneInstance
      key={graphIdentity}
      {...props}
      nodes={snapshot.nodes}
      edges={snapshot.edges}
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
  labelColor = '#e2e8f0',
  particleColor = '#8fd3ff',
  reducedMotion = false,
}: KnowledgeGraph3DSceneProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const particlesRef = useRef<THREE.InstancedMesh>(null);
  const arrowsRef = useRef<THREE.InstancedMesh>(null);
  const labelGroupRef = useRef<THREE.Group>(null);
  const sceneGroupRef = useRef<THREE.Group>(null);
  const camera = useThree(selectCamera);
  const gl = useThree(selectRenderer);
  const invalidate = useThree(selectInvalidate);

  // The exported keyed wrapper remounts this instance for a different declared
  // graph namespace, so these refs persist only across same-key filters/views.
  const [posMap] = useState(() => ({
    current: new Map<string, GraphLayoutPosition>(),
  }));
  const readyGraphKeyRef = useRef<string | null>(null);
  const framedRef = useRef(false);
  // The currently-selected node id the camera is easing toward (live-tracked, so
  // the pivot follows the node as the layout settles — not a stale snapshot).
  const flyToIdRef = useRef<string | null>(null);
  const onHoverRef = useRef(onHover);
  useLayoutEffect(() => {
    onHoverRef.current = onHover;
  }, [onHover]);
  useEffect(() => () => onHoverRef.current(null), []);

  // User grab ('start' from the host's controls: drag/zoom begin) cancels any
  // scene-driven camera intent — the pending one-time auto-frame and an
  // in-flight fly-to — so the camera never fights the user's hand. Attached
  // lazily in useFrame (hosts may mount controls after the scene) and
  // re-attached if the controls instance swaps.
  const attachedControlsRef = useRef<ControlsHandle | null>(null);
  const [onUserGrab] = useState(
    () => () => {
      framedRef.current = true;
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
  const layoutInput = snapshotGraphLayoutInputs(nodes, edges);
  const graphKey = layoutInput.graphKey;
  const normalizedQuery = useMemo(() => normalizeGraphQuery(query), [query]);
  const queryMatchIds = graphQueryMatchIds(nodes, normalizedQuery, edges);
  const queryActive = normalizedQuery.length > 0;
  const visualNodes = nodes.map(({ id, label, color }) => ({ id, label, color }));

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
  const particleDistribution = planFlowParticleDistribution(
    flowEdges.length,
    PARTICLES_PER_EDGE,
    MAX_PARTICLES,
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

  // Exact buffers: four quadratic chords × two vertices × three floats per edge.
  const linePos = useMemo(
    () => new Float32Array(validEdges.length * GRAPH_EDGE_CURVE_SEGMENTS * 6),
    [validEdges],
  );
  const lineCol = useMemo(
    () => new Float32Array(validEdges.length * GRAPH_EDGE_CURVE_SEGMENTS * 6),
    [validEdges],
  );

  // (Re)create the 3D force simulation whenever the graph changes.
  const layoutRuntimeRef = useRef<GraphLayoutRuntime | null>(null);
  const layoutTickAccumulatorRef = useRef(0);
  const geometryDirtyRef = useRef(true);
  const flowTimeRef = useRef(0);
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
      .force('collide', forceCollide((d) => (d as SimGraphNode).r + 3).iterations(2))
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
      for (let i = 0; i < budget && sim.alpha() > 0.008; i++) sim.tick();
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
  }, [graphKey, layoutNodes, simLinks, reducedMotion, invalidate]);

  // A graph-key or motion-policy change must never expose matrices from the
  // preceding runtime under current click/hover identities. Hide before paint;
  // the first successful current-runtime frame reveals the complete scene.
  useLayoutEffect(() => {
    beginKnowledgeGraphRuntimeTransition(
      readyGraphKeyRef,
      geometryDirtyRef,
      sceneGroupRef.current,
      invalidate,
      () => onHoverRef.current(null),
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
    const isDimmed = (id: string): number => {
      if (focus && id !== focus && !focusSet?.has(id)) return 0.8;
      if (!focus && queryActive && !queryMatchIds.has(id)) return 0.82;
      return 0;
    };
    if (mesh) {
      visualNodes.forEach((n, i) => {
        mesh.setColorAt(i, dim(n.color, isDimmed(n.id)));
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    // Link colors: dim edges not incident to the focus node.
    let k = 0;
    for (const e of validEdges) {
      const incident = focus
        ? e.source === focus || e.target === focus
        : graphEdgeMatchesQuery(e.source, e.target, queryMatchIds, normalizedQuery);
      const c = dim(e.color, incident ? 0.25 : 0.86);
      for (let chord = 0; chord < GRAPH_EDGE_CURVE_SEGMENTS; chord++) {
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
        arrows.setColorAt(arrowIndex, dim(edge.color, incident ? 0.15 : 0.86));
      });
      if (arrows.instanceColor) arrows.instanceColor.needsUpdate = true;
    }
  }, [
    visualNodes,
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
    if (flyToIdRef.current) invalidate();
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
    if (sim.alpha() > 0.008) {
      const advanced = advanceGraphLayoutClockInto(
        layoutTickAccumulatorRef.current,
        delta,
        _layoutClockResult,
      );
      layoutTickAccumulatorRef.current = advanced.remainderSeconds;
      for (let tick = 0; tick < advanced.ticks && sim.alpha() > 0.008; tick++) {
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
        const pop = focus && (n.id === focus || focusSet?.has(n.id)) ? 1.28 : 1;
        _dummy.scale.setScalar(n.r * pop);
        _dummy.updateMatrix();
        mesh.setMatrixAt(i, _dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      // Instances moved: drop three's cached bounds so the next hover/click
      // raycast recomputes them — a stale sphere makes drifted nodes unhittable.
      mesh.boundingSphere = null;

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
          linePos[k] = _curvePoint.x;
          linePos[k + 1] = _curvePoint.y;
          linePos[k + 2] = _curvePoint.z;
          linePos[k + 3] = _curveNext.x;
          linePos[k + 4] = _curveNext.y;
          linePos[k + 5] = _curveNext.z;
          _curvePoint.copy(_curveNext);
          k += 6;
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
          const target = simNodes[index.get(edge.target) as number];
          setEdgeCurve(source, target, lane);
          // The derivative at t=1 points from the control point to the target.
          _direction.subVectors(_b, _curveControl);
          if (_direction.lengthSq() <= 1e-12) {
            _dummy.position.copy(_b);
            _dummy.quaternion.identity();
            _dummy.scale.setScalar(0);
          } else {
            _direction.normalize();
            _dummy.position
              .copy(_b)
              .addScaledVector(_direction, -(target.r + 1.5));
            _dummy.quaternion.setFromUnitVectors(_up, _direction);
            _dummy.scale.set(1.25, 3, 1.25);
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
      const speed = 0.28;
      // Reduced motion: hold the beads still — static markers along the edge
      // keep the flow topology readable without the glide.
      if (!reducedMotion) flowTimeRef.current += delta;
      const base = reducedMotion ? 0 : flowTimeRef.current * speed;
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
          const frac = (base + phase + q / edgeParticleCount) % 1;
          graphEdgeCurvePointInto(_a, _curveControl, _b, frac, _dummy.position);
          _dummy.scale.setScalar(size);
          _dummy.updateMatrix();
          pmesh.setMatrixAt(p, _dummy.matrix);
          p++;
        }
      }
      pmesh.instanceMatrix.needsUpdate = true;
    }

    // One floating label follows the focus node (hidden when no valid focus).
    const label = labelGroupRef.current;
    if (label) {
      const fi = focus != null ? index.get(focus) : undefined;
      if (fi != null) {
        const n = simNodes[fi];
        label.position.set(n.x ?? 0, (n.y ?? 0) + n.r + 4, n.z ?? 0);
        label.visible = true;
      } else {
        label.visible = false;
      }
    }

    // One-time auto-frame once the layout has roughly settled (canceled for
    // good the moment the user grabs the controls).
    if (
      autoFrame &&
      controls &&
      !framedRef.current &&
      simNodes.length > 0 &&
      sim.alpha() < 0.25
    ) {
      _box.makeEmpty();
      for (let nodeIndex = 0; nodeIndex < simNodes.length; nodeIndex++) {
        const n = simNodes[nodeIndex];
        _box.expandByPoint(_a.set(n.x ?? 0, n.y ?? 0, n.z ?? 0));
      }
      const sphere = _box.getBoundingSphere(_sphere);
      const dist = Math.max(120, sphere.radius * 2.4);
      camera.position.set(sphere.center.x, sphere.center.y, sphere.center.z + dist);
      controls.target.copy(sphere.center);
      controls.update();
      // A throwing host control remains retryable; user grabs still cancel
      // eagerly because user intent, unlike programmatic framing, is final.
      framedRef.current = true;
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
      sim.alpha() > 0.008 ||
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
      if (e.instanceId == null || e.instanceId >= visualNodes.length) return;
      // Three raycasting does not skip invisible ancestors. An unready mesh must
      // not swallow events intended for another scene object.
      e.stopPropagation();
      const id = visualNodes[e.instanceId].id;
      // Fire only on CHANGE — pointermove is per-frame, and an unguarded call
      // would re-render a state-holding host on every mouse twitch.
      if (id !== hoverId) onHover(id);
    },
    [graphKey, reducedMotion, visualNodes, onHover, hoverId],
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
        () => onHover(null),
      );
    },
    [graphKey, reducedMotion, onHover],
  );
  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      const runtime = layoutRuntimeRef.current;
      if (
        readyGraphKeyRef.current !== graphKey ||
        geometryDirtyRef.current ||
        runtime?.graphKey !== graphKey ||
        runtime.reducedMotion !== reducedMotion
      ) return;
      if (e.instanceId != null && e.instanceId < visualNodes.length) {
        e.stopPropagation();
        onSelect(visualNodes[e.instanceId].id);
      }
    },
    [graphKey, reducedMotion, visualNodes, onSelect],
  );

  return (
    <>
      <group key={`graph-${graphKey}`} ref={sceneGroupRef} visible={false}>
      {/* Nodes — one instanced, unlit, additively-bloomed sphere per record.
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

      {/* Edges — additive glowing line segments (culling off: positions stream
          every frame, so the once-cached geometry bounds go stale). */}
      <lineSegments key={`lines-${validEdges.length}`} ref={linesRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePos, 3]} />
          <bufferAttribute attach="attributes-color" args={[lineCol, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.75}
          toneMapped={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
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
            color={particleColor}
            toneMapped={false}
            transparent
            opacity={0.9}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </instancedMesh>
      ) : null}

      {/* Floating label for the focused node. */}
      <group ref={labelGroupRef} visible={false}>
        <FocusLabelSprite
          text={focusLabel}
          color={labelColor}
          invalidate={invalidate}
        />
      </group>
      </group>
    </>
  );
}

export * from './knowledgeGraph';
export * from './KnowledgeGraphA11yList';
