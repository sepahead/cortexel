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
//   • Layout is deterministic: unseeded nodes get d3-force-3d's golden-ratio
//     phyllotaxis placement and its forces use a seeded LCG, so the same graph
//     lays out identically on every mount (reproducible reading/screenshots).

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceCollide,
  type Simulation,
  type SimNode,
} from 'd3-force-3d';
import {
  advanceGraphLayoutClockInto,
  assignGraphEdgeLanes,
  assertKnowledgeGraphBudget,
  assertRenderableGraphEdges,
  assertUniqueGraphNodeIds,
  buildAdjacency,
  filterGraphEdges,
  flowParticleCount,
  GRAPH_EDGE_CURVE_SEGMENTS,
  graphEdgeControlPointInto,
  graphEdgeCurvePointInto,
  graphEdgeMatchesQuery,
  graphQueryMatchIds,
  graphSignature,
  normalizeGraphNodeRadius,
  normalizeGraphQuery,
  reducedMotionLayoutTickBudget,
  uniqueGraphTopologyLinks,
  type KnowledgeGraphAttributes,
  type KnowledgeGraphEpistemic,
  type KnowledgeGraphEvidenceRef,
  type KnowledgeGraphUncalibratedScore,
  type GraphEdgeLane,
} from './knowledgeGraph';
import { safeDiagnosticText } from '../core/safeRuntime';

export interface KnowledgeGraph3DNode {
  id: string;
  label: string;
  detail?: string;
  attributes?: Readonly<KnowledgeGraphAttributes>;
  epistemic?: Readonly<KnowledgeGraphEpistemic>;
  evidence?: readonly KnowledgeGraphEvidenceRef[];
  uncalibrated_score?: Readonly<KnowledgeGraphUncalibratedScore>;
  color: string; // hex string — the node carries its own color (not host palette)
  radius: number; // invalid/out-of-range values fall back to a safe scene radius
  /** Human-readable semantics for radius. Omitted means caller-defined visual size. */
  radiusMeaning?: string;
  kind: string; // 'paper' | 'model' | 'family' | …
}

export interface KnowledgeGraph3DEdge {
  /** Stable assertion identity. Distinct ids may share endpoints and kind. */
  id?: string;
  label?: string;
  attributes?: Readonly<KnowledgeGraphAttributes>;
  epistemic?: Readonly<KnowledgeGraphEpistemic>;
  evidence?: readonly KnowledgeGraphEvidenceRef[];
  uncalibrated_score?: Readonly<KnowledgeGraphUncalibratedScore>;
  source: string;
  target: string;
  color: string; // hex string
  /** Directed edges receive a persistent arrowhead (including reduced motion). */
  directed?: boolean;
  kind: string;
  /** Animate glowing particles flowing source→target (e.g. citations). */
  particles?: boolean;
}

/** Minimal OrbitControls surface the scene needs for auto-frame + fly-to. The
 *  controls themselves stay host-side (Design Law #5); the host passes a ref. */
export interface ControlsHandle {
  target: THREE.Vector3;
  update: () => void;
  /** Optional EventDispatcher surface (OrbitControls has it). When present, the
   *  scene cancels its own camera moves on 'start' (user grab: drag/zoom
   *  begin) — the user's hand always wins over auto-frame and fly-to. */
  addEventListener?(type: 'start', listener: () => void): void;
  removeEventListener?(type: 'start', listener: () => void): void;
}

export interface KnowledgeGraph3DSceneProps {
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

const PARTICLES_PER_EDGE = 4;
const MAX_PARTICLES = 4000;
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
 *  and keeps Cortexel's no-implicit-network guarantee intact. */
function FocusLabelSprite({ text, color }: { text: string; color: string }) {
  const label = safeDiagnosticText(text, 120);
  const rendered = useMemo(() => {
    if (!label || typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;

    const fontSize = 42;
    const paddingX = 24;
    const paddingY = 14;
    context.font = `600 ${fontSize}px system-ui, sans-serif`;
    const measured = Math.ceil(context.measureText(label).width);
    canvas.width = Math.min(1024, Math.max(96, measured + paddingX * 2));
    canvas.height = fontSize + paddingY * 2;

    context.font = `600 ${fontSize}px system-ui, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = 'rgba(3, 7, 17, 0.9)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#e2e8f0';
    context.fillStyle = color;
    context.fillText(label, canvas.width / 2, canvas.height / 2, canvas.width - paddingX * 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return { texture, aspect: canvas.width / canvas.height };
  }, [label, color]);

  useEffect(() => () => rendered?.texture.dispose(), [rendered]);
  if (!rendered) return null;
  return (
    <sprite scale={[Math.min(160, rendered.aspect * 7), 7, 1]}>
      <spriteMaterial
        map={rendered.texture}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}

interface SimGraphNode extends SimNode {
  id: string;
  r: number;
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

export function KnowledgeGraph3DScene({
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
  assertKnowledgeGraphBudget(nodes.length, edges.length);
  assertUniqueGraphNodeIds(nodes);
  assertRenderableGraphEdges(nodes, edges);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const particlesRef = useRef<THREE.InstancedMesh>(null);
  const arrowsRef = useRef<THREE.InstancedMesh>(null);
  const labelGroupRef = useRef<THREE.Group>(null);
  const { camera, gl, invalidate } = useThree();

  // Persist positions across data updates so filtering/toggling never
  // re-scatters the layout the user has been reading.
  const posMap = useRef<Map<string, [number, number, number]>>(new Map());
  const framedRef = useRef(false);
  // The currently-selected node id the camera is easing toward (live-tracked, so
  // the pivot follows the node as the layout settles — not a stale snapshot).
  const flyToIdRef = useRef<string | null>(null);
  const onHoverRef = useRef(onHover);
  useEffect(() => {
    onHoverRef.current = onHover;
  }, [onHover]);
  useEffect(() => () => onHoverRef.current(null), []);

  // User grab ('start' from the host's controls: drag/zoom begin) cancels any
  // scene-driven camera intent — the pending one-time auto-frame and an
  // in-flight fly-to — so the camera never fights the user's hand. Attached
  // lazily in useFrame (hosts may mount controls after the scene) and
  // re-attached if the controls instance swaps.
  const attachedControlsRef = useRef<ControlsHandle | null>(null);
  const onUserGrabRef = useRef(() => {
    framedRef.current = true;
    flyToIdRef.current = null;
  });
  useEffect(
    () => () => {
      attachedControlsRef.current?.removeEventListener?.('start', onUserGrabRef.current);
      attachedControlsRef.current = null;
    },
    [],
  );

  // Content signature of the graph: the simulation memo below is keyed on THIS,
  // not on array identity, so a host that rebuilds nodes/edges every render (the
  // common React pattern) never restarts a settled layout. Any REAL change —
  // structure, radius, edge styling — still yields a new key (warm restart).
  const graphKey = useMemo(() => graphSignature(nodes, edges), [nodes, edges]);
  const normalizedQuery = useMemo(() => normalizeGraphQuery(query), [query]);
  const queryMatchIds = useMemo(
    () => graphQueryMatchIds(nodes, normalizedQuery, edges),
    [nodes, edges, normalizedQuery],
  );
  const queryActive = normalizedQuery.length > 0;

  // Build simulation node/link arrays (seeded from remembered positions), the
  // fast id→index map, and the VALID edge set (both endpoints present, no
  // self-loops) that every render path shares. Recomputed only on CONTENT change.
  const { simNodes, simLinks, validEdges, edgeLanes, index, warmStart } = useMemo(() => {
    const index = new Map<string, number>();
    let warmStart = false;
    const simNodes: SimGraphNode[] = nodes.map((n, i) => {
      index.set(n.id, i);
      // Sanitize radius once: a non-finite/≤0 radius would write a NaN instance
      // matrix and poison forceCollide, so fall back to a sane default here.
      const r = normalizeGraphNodeRadius(n.radius);
      const prev = posMap.current.get(n.id);
      if (prev) warmStart = true;
      else posMap.current.set(n.id, [0, 0, 0]);
      // Remembered nodes keep their positions; NEW nodes stay unseeded so
      // d3-force-3d places them on its deterministic phyllotaxis sphere.
      return prev ? { id: n.id, r, x: prev[0], y: prev[1], z: prev[2] } : { id: n.id, r };
    });
    // One valid-edge set for ALL paths (layout, adjacency, buffers, endpoints,
    // particles, emphasis) so their element counts can never disagree. Direct
    // inputs already failed closed above; the filter remains defensive/shared.
    const validEdges = filterGraphEdges(new Set(index.keys()), edges);
    const edgeLanes = assignGraphEdgeLanes(validEdges);
    const simLinks = uniqueGraphTopologyLinks(validEdges);
    // Bound the remembered-position cache in long high-churn sessions (only prune
    // ids no longer present, and only once the cache is large — so ordinary
    // filter/toggle still restores positions).
    if (posMap.current.size > MAX_REMEMBERED_POSITIONS) {
      for (const key of posMap.current.keys()) {
        if (!index.has(key)) posMap.current.delete(key);
      }
    }
    return { simNodes, simLinks, validEdges, edgeLanes, index, warmStart };
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
  const particleCount = flowParticleCount(
    flowEdges.length,
    PARTICLES_PER_EDGE,
    MAX_PARTICLES,
  );
  useEffect(() => {
    if (flowEdges.length * PARTICLES_PER_EDGE > MAX_PARTICLES) {
      devWarn(
        `KnowledgeGraph3DScene: ${flowEdges.length} flow edges exceed the ` +
          `${MAX_PARTICLES}-particle cap; some citation flows are not animated.`,
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
  const simRef = useRef<Simulation<SimGraphNode> | null>(null);
  const layoutTickAccumulatorRef = useRef(0);
  const geometryDirtyRef = useRef(true);
  const flowTimeRef = useRef(0);
  useEffect(() => {
    const linkForce = forceLink<SimGraphNode>(simLinks as never)
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
      .alpha(warmStart ? 0.5 : 1)
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
    simRef.current = sim;
    layoutTickAccumulatorRef.current = 0;
    geometryDirtyRef.current = true;
    invalidate();
    // NOTE: framedRef is intentionally NOT reset here. Auto-frame is once per
    // mount, so a filter/toggle never yanks the camera the user has positioned.
    return () => {
      sim.stop();
      simRef.current = null;
    };
  }, [simNodes, simLinks, warmStart, reducedMotion, invalidate]);

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
      nodes.forEach((n, i) => {
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
    nodes,
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
  }, [selectedId, index, flyToSelection, invalidate]);

  // The animation loop: settle the sim, stream positions into the GPU buffers,
  // advance flow particles, keep the label pinned, and ease the camera.
  useFrame((_, delta) => {
    const sim = simRef.current;
    const mesh = meshRef.current;
    if (!sim || !mesh) return;

    // Keep the user-grab cancel listener bound to the CURRENT controls instance.
    const controls = controlsRef?.current ?? null;
    if (controls !== attachedControlsRef.current) {
      attachedControlsRef.current?.removeEventListener?.('start', onUserGrabRef.current);
      controls?.addEventListener?.('start', onUserGrabRef.current);
      attachedControlsRef.current = controls;
    }

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
    if (positionsChanged) {
      _dummy.quaternion.identity();
      for (let i = 0; i < simNodes.length; i++) {
        const n = simNodes[i];
        const x = n.x ?? 0;
        const y = n.y ?? 0;
        const z = n.z ?? 0;
        const previous = posMap.current.get(n.id);
        if (previous) {
          previous[0] = x;
          previous[1] = y;
          previous[2] = z;
        }
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
      geometryDirtyRef.current = false;
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
        for (let q = 0; q < PARTICLES_PER_EDGE && p < particleCount; q++) {
          const frac = (base + phase + q / PARTICLES_PER_EDGE) % 1;
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
      framedRef.current = true;
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
        controls.target.lerp(_a, reducedMotion ? 1 : Math.min(1, delta * 3));
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
  });

  const focusLabel = useMemo(() => {
    const raw = hoverId ?? selectedId;
    const focus = raw != null && index.has(raw) ? raw : null;
    const focusIndex = focus ? index.get(focus) : undefined;
    return focusIndex == null ? '' : nodes[focusIndex]?.label ?? '';
  }, [hoverId, selectedId, index, nodes]);

  const handleMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (e.instanceId == null || e.instanceId >= nodes.length) return;
      const id = nodes[e.instanceId].id;
      // Fire only on CHANGE — pointermove is per-frame, and an unguarded call
      // would re-render a state-holding host on every mouse twitch.
      if (id !== hoverId) onHover(id);
    },
    [nodes, onHover, hoverId],
  );
  const handleOut = useCallback(() => onHover(null), [onHover]);
  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (e.instanceId != null && e.instanceId < nodes.length) onSelect(nodes[e.instanceId].id);
    },
    [nodes, onSelect],
  );

  return (
    <>
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
        <FocusLabelSprite text={focusLabel} color={labelColor} />
      </group>
    </>
  );
}

export * from './knowledgeGraph';
export * from './KnowledgeGraphA11yList';
