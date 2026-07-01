// KnowledgeGraph3DScene — a Canvas-less, host-agnostic 3D corpus-knowledge-graph
// scene primitive (Design Law #5: the library renders ONLY scene contents; the
// host owns <Canvas>, OrbitControls, bloom, background, fog and Stars).
//
// It draws abstract KnowledgeGraph3DNode / KnowledgeGraph3DEdge records — each
// carrying its own precomputed color, radius and kind — so the same renderer
// draws a paper graph or a multi-type entity graph (papers + models + families)
// with zero renderer changes. The caller owns all domain→visual mapping.
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

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Billboard, Text, useCursor } from '@react-three/drei';
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

export interface KnowledgeGraph3DNode {
  id: string;
  label: string;
  color: string; // hex string — the node carries its own color (not host palette)
  radius: number; // world units
  kind: string; // 'paper' | 'model' | 'family' | …
}

export interface KnowledgeGraph3DEdge {
  source: string;
  target: string;
  color: string; // hex string
  directed: boolean;
  kind: string;
  /** Animate glowing particles flowing source→target (e.g. citations). */
  particles?: boolean;
}

/** Minimal OrbitControls surface the scene needs for auto-frame + fly-to. The
 *  controls themselves stay host-side (Design Law #5); the host passes a ref. */
export interface ControlsHandle {
  target: THREE.Vector3;
  update: () => void;
}

export interface KnowledgeGraph3DSceneProps {
  nodes: KnowledgeGraph3DNode[];
  edges: KnowledgeGraph3DEdge[];
  selectedId: string | null;
  query: string;
  onSelect: (id: string) => void;
  hoverId: string | null;
  onHover: (id: string | null) => void;
  /** Host-owned OrbitControls ref, used for camera auto-frame + fly-to. When
   *  absent, the scene renders and lays out normally but skips camera moves. */
  controlsRef?: React.RefObject<ControlsHandle | null>;
  /** Focus-label color (default a light slate). Not host-palette-hardcoded. */
  labelColor?: string;
}

const PARTICLES_PER_EDGE = 4;
const MAX_PARTICLES = 4000;
const LABEL_OUTLINE = '#030711';

// Reusable scratch objects — never allocate inside useFrame.
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _dimTarget = new THREE.Color('#030711');
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _box = new THREE.Box3();
const _sphere = new THREE.Sphere();

/** Dim a color toward the void background so unfocused elements stop blooming. */
function dim(hex: string, amount: number): THREE.Color {
  return _color.set(hex).lerp(_dimTarget, amount).clone();
}

interface SimGraphNode extends SimNode {
  id: string;
  r: number;
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
  labelColor = '#e2e8f0',
}: KnowledgeGraph3DSceneProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const particlesRef = useRef<THREE.InstancedMesh>(null);
  const labelGroupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useCursor(hoverId != null);

  // Persist positions across data updates so filtering/toggling never
  // re-scatters the layout the user has been reading.
  const posMap = useRef<Map<string, [number, number, number]>>(new Map());
  const framedRef = useRef(false);
  const flyToRef = useRef<THREE.Vector3 | null>(null);

  // Build simulation node/link arrays (seeded from remembered positions), plus a
  // fast id→index map. Recomputed only when the actual data changes.
  const { simNodes, simLinks, index } = useMemo(() => {
    const index = new Map<string, number>();
    const simNodes: SimGraphNode[] = nodes.map((n, i) => {
      index.set(n.id, i);
      const prev = posMap.current.get(n.id);
      const spread = 90;
      return {
        id: n.id,
        r: n.radius,
        x: prev ? prev[0] : (Math.random() * 2 - 1) * spread,
        y: prev ? prev[1] : (Math.random() * 2 - 1) * spread,
        z: prev ? prev[2] : (Math.random() * 2 - 1) * spread,
      };
    });
    const simLinks = edges
      .filter((e) => index.has(e.source) && index.has(e.target))
      .map((e) => ({ source: e.source, target: e.target }));
    return { simNodes, simLinks, index };
  }, [nodes, edges]);

  // Visible-edge adjacency, for hover/selection neighbor emphasis.
  const neighbors = useMemo(() => {
    const m = new Map<string, Set<string>>();
    nodes.forEach((n) => m.set(n.id, new Set()));
    edges.forEach((e) => {
      m.get(e.source)?.add(e.target);
      m.get(e.target)?.add(e.source);
    });
    return m;
  }, [nodes, edges]);

  // The (few) edges that carry animated flow particles.
  const flowEdges = useMemo(
    () => edges.filter((e) => e.particles && index.has(e.source) && index.has(e.target)),
    [edges, index],
  );
  const particleCount = Math.min(MAX_PARTICLES, flowEdges.length * PARTICLES_PER_EDGE);

  // Buffers for the line segments (2 verts/edge × 3 floats), rebuilt on change.
  const linePos = useMemo(() => new Float32Array(simLinks.length * 6), [simLinks]);
  const lineCol = useMemo(() => new Float32Array(simLinks.length * 6), [simLinks]);

  // (Re)create the 3D force simulation whenever the graph changes.
  const simRef = useRef<Simulation<SimGraphNode> | null>(null);
  useEffect(() => {
    const linkForce = forceLink<SimGraphNode>(simLinks as never)
      .id((d) => d.id)
      .distance(34)
      .strength(0.35);
    const sim = forceSimulation<SimGraphNode>(simNodes, 3)
      .force('charge', forceManyBody().strength(-140).distanceMax(600))
      .force('link', linkForce)
      .force('center', forceCenter(0, 0, 0).strength(0.04))
      .force('collide', forceCollide((d) => (d as SimGraphNode).r + 3).iterations(2))
      .alpha(1)
      .alphaDecay(0.018)
      .velocityDecay(0.42)
      .stop();
    simRef.current = sim;
    framedRef.current = false;
    return () => {
      sim.stop();
      simRef.current = null;
    };
  }, [simNodes, simLinks]);

  // Emphasis: bake node + link colors on discrete focus/query changes (not per frame).
  const applyEmphasis = useCallback(() => {
    const mesh = meshRef.current;
    const focus = hoverId ?? selectedId;
    const focusSet = focus ? neighbors.get(focus) : null;
    const q = query.trim().toLowerCase();
    const isDimmed = (id: string, label: string): number => {
      if (focus && id !== focus && !focusSet?.has(id)) return 0.8;
      if (!focus && q && !label.toLowerCase().includes(q)) return 0.82;
      return 0;
    };
    if (mesh) {
      nodes.forEach((n, i) => {
        mesh.setColorAt(i, dim(n.color, isDimmed(n.id, n.label)));
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    // Link colors: dim edges not incident to the focus node.
    let k = 0;
    for (const e of edges) {
      if (!index.has(e.source) || !index.has(e.target)) continue;
      const incident = !focus || e.source === focus || e.target === focus;
      const c = dim(e.color, incident ? 0.25 : 0.86);
      lineCol[k] = c.r;
      lineCol[k + 1] = c.g;
      lineCol[k + 2] = c.b;
      lineCol[k + 3] = c.r;
      lineCol[k + 4] = c.g;
      lineCol[k + 5] = c.b;
      k += 6;
    }
    const geom = linesRef.current?.geometry;
    const attr = geom?.getAttribute('color') as THREE.BufferAttribute | undefined;
    if (attr) attr.needsUpdate = true;
  }, [nodes, edges, index, neighbors, hoverId, selectedId, query, lineCol]);

  useEffect(() => {
    applyEmphasis();
  }, [applyEmphasis]);

  // Fly the camera to the selected node when selection changes.
  useEffect(() => {
    if (!selectedId) return;
    const i = index.get(selectedId);
    if (i == null) return;
    const n = simNodes[i];
    flyToRef.current = new THREE.Vector3(n.x, n.y, n.z);
  }, [selectedId, index, simNodes]);

  // The animation loop: settle the sim, stream positions into the GPU buffers,
  // advance flow particles, keep the label pinned, and ease the camera.
  useFrame((_, delta) => {
    const sim = simRef.current;
    const mesh = meshRef.current;
    if (!sim || !mesh) return;

    if (sim.alpha() > 0.008) sim.tick();

    // Node instance matrices + remember positions.
    const focus = hoverId ?? selectedId;
    const focusSet = focus ? neighbors.get(focus) : null;
    for (let i = 0; i < simNodes.length; i++) {
      const n = simNodes[i];
      const x = n.x ?? 0;
      const y = n.y ?? 0;
      const z = n.z ?? 0;
      posMap.current.set(n.id, [x, y, z]);
      _dummy.position.set(x, y, z);
      const pop = focus && (n.id === focus || focusSet?.has(n.id)) ? 1.28 : 1;
      _dummy.scale.setScalar(n.r * pop);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    // Edge endpoints.
    let k = 0;
    for (const e of edges) {
      const si = index.get(e.source);
      const ti = index.get(e.target);
      if (si == null || ti == null) continue;
      const s = simNodes[si];
      const t = simNodes[ti];
      linePos[k] = s.x ?? 0;
      linePos[k + 1] = s.y ?? 0;
      linePos[k + 2] = s.z ?? 0;
      linePos[k + 3] = t.x ?? 0;
      linePos[k + 4] = t.y ?? 0;
      linePos[k + 5] = t.z ?? 0;
      k += 6;
    }
    const posAttr = linesRef.current?.geometry.getAttribute('position') as
      | THREE.BufferAttribute
      | undefined;
    if (posAttr) posAttr.needsUpdate = true;

    // Citation flow particles gliding along their edges.
    const pmesh = particlesRef.current;
    if (pmesh && particleCount > 0) {
      const speed = 0.28;
      const base = (performance.now() / 1000) * speed;
      let p = 0;
      for (let fe = 0; fe < flowEdges.length && p < particleCount; fe++) {
        const e = flowEdges[fe];
        const s = simNodes[index.get(e.source) as number];
        const t = simNodes[index.get(e.target) as number];
        _a.set(s.x ?? 0, s.y ?? 0, s.z ?? 0);
        _b.set(t.x ?? 0, t.y ?? 0, t.z ?? 0);
        for (let q = 0; q < PARTICLES_PER_EDGE && p < particleCount; q++) {
          const frac = (((base + q / PARTICLES_PER_EDGE) % 1) + 1) % 1;
          _dummy.position.copy(_a).lerp(_b, frac);
          _dummy.scale.setScalar(1.3);
          _dummy.updateMatrix();
          pmesh.setMatrixAt(p, _dummy.matrix);
          p++;
        }
      }
      pmesh.instanceMatrix.needsUpdate = true;
    }

    // One floating label follows the focus node.
    const label = labelGroupRef.current;
    if (label) {
      if (focus) {
        const fi = index.get(focus);
        if (fi != null) {
          const n = simNodes[fi];
          label.position.set(n.x ?? 0, (n.y ?? 0) + n.r + 4, n.z ?? 0);
          label.visible = true;
        }
      } else {
        label.visible = false;
      }
    }

    // One-time auto-frame once the layout has roughly settled (host controls).
    const controls = controlsRef?.current;
    if (!framedRef.current && sim.alpha() < 0.25) {
      framedRef.current = true;
      _box.makeEmpty();
      for (const n of simNodes) _box.expandByPoint(_a.set(n.x ?? 0, n.y ?? 0, n.z ?? 0));
      const sphere = _box.getBoundingSphere(_sphere);
      const dist = Math.max(120, sphere.radius * 2.4);
      camera.position.set(sphere.center.x, sphere.center.y, sphere.center.z + dist);
      if (controls) {
        controls.target.copy(sphere.center);
        controls.update();
      }
    }

    // Ease the camera target toward a freshly selected node.
    if (flyToRef.current && controls) {
      controls.target.lerp(flyToRef.current, Math.min(1, delta * 3));
      if (controls.target.distanceTo(flyToRef.current) < 0.5) flyToRef.current = null;
      controls.update();
    }
  });

  const focusLabel = useMemo(() => {
    const focus = hoverId ?? selectedId;
    return focus ? nodes.find((n) => n.id === focus)?.label ?? '' : '';
  }, [hoverId, selectedId, nodes]);

  const handleMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (e.instanceId != null && e.instanceId < nodes.length) onHover(nodes[e.instanceId].id);
    },
    [nodes, onHover],
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
      {/* Nodes — one instanced, unlit, additively-bloomed sphere per record. */}
      <instancedMesh
        key={`nodes-${nodes.length}`}
        ref={meshRef}
        args={[undefined, undefined, Math.max(1, nodes.length)]}
        onPointerMove={handleMove}
        onPointerOut={handleOut}
        onClick={handleClick}
      >
        <sphereGeometry args={[1, 20, 20]} />
        {/* Unlit: per-instance color IS the emissive bloom source. */}
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {/* Edges — additive glowing line segments. */}
      <lineSegments key={`lines-${simLinks.length}`} ref={linesRef}>
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

      {/* Citation flow particles. */}
      {particleCount > 0 ? (
        <instancedMesh
          key={`p-${particleCount}`}
          ref={particlesRef}
          args={[undefined, undefined, particleCount]}
        >
          <sphereGeometry args={[0.6, 6, 6]} />
          <meshBasicMaterial
            color="#8fd3ff"
            toneMapped={false}
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
          />
        </instancedMesh>
      ) : null}

      {/* Floating label for the focused node. */}
      <group ref={labelGroupRef} visible={false}>
        <Billboard>
          <Text
            fontSize={7}
            color={labelColor}
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.4}
            outlineColor={LABEL_OUTLINE}
            maxWidth={160}
          >
            {focusLabel}
          </Text>
        </Billboard>
      </group>
    </>
  );
}

export default KnowledgeGraph3DScene;
