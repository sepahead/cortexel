import { validateSkillInvocation, getPalette, validateVizSpec, requiresHonestyCaption, defaultHonestyCaption } from './chunk-2XFQVRBH.js';
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE3 from 'three';
import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { useCursor, Billboard, Text } from '@react-three/drei';
import { forceLink, forceSimulation, forceManyBody, forceCenter, forceCollide } from 'd3-force-3d';

function usePopulationExpand(controlled) {
  const [localSelected, setLocalSelected] = useState(null);
  const [localHovered, setLocalHovered] = useState(null);
  const selectedPopId = controlled ? controlled.selectedPopId : localSelected;
  const hoveredPopId = controlled ? controlled.hoveredPopId : localHovered;
  const setSelectedPopId = controlled ? controlled.setSelectedPopId : setLocalSelected;
  const setHoveredPopId = controlled ? controlled.setHoveredPopId : setLocalHovered;
  const toggleSelected = useCallback(
    (id) => setSelectedPopId(selectedPopId === id ? null : id),
    [selectedPopId, setSelectedPopId]
  );
  const reset = useCallback(() => {
    setSelectedPopId(null);
    setHoveredPopId(null);
  }, [setSelectedPopId, setHoveredPopId]);
  return {
    selectedPopId,
    hoveredPopId,
    setSelectedPopId,
    setHoveredPopId,
    isSelected: (id) => selectedPopId === id,
    isHovered: (id) => hoveredPopId === id,
    isAnySelected: () => selectedPopId !== null,
    toggleSelected,
    reset
  };
}
function ExpandablePopulation({
  position,
  color,
  isSelected,
  isAnySelected,
  isHovered,
  onHover,
  onClick,
  themeMode,
  size = 0.3,
  reducedMotion = false
}) {
  const meshRef = useRef(null);
  const ringRef = useRef(null);
  const scaleRef = useRef(1);
  const opacityRef = useRef(1);
  const colorObj = useMemo(() => new THREE3.Color(color), [color]);
  const voxelColor = useMemo(() => colorObj.clone().multiplyScalar(0.82), [colorObj]);
  const ringColor = useMemo(
    () => themeMode === "light" ? colorObj.clone().multiplyScalar(0.8) : colorObj.clone().multiplyScalar(1.15),
    // bloom-safe cap (was 1.25)
    [colorObj, themeMode]
  );
  const ringInner = size * 0.867;
  const ringOuter = size * 1.067;
  useFrame((state, delta) => {
    let targetScale = 1;
    let targetOpacity = 1;
    if (isSelected) {
      targetScale = 0;
      targetOpacity = 0;
    } else if (isAnySelected) {
      targetScale = 0.5;
      targetOpacity = 0.05;
    } else if (isHovered) {
      targetScale = 1.25;
      targetOpacity = 1;
    }
    const lerp = reducedMotion ? 1 : 0.15;
    scaleRef.current += (targetScale - scaleRef.current) * lerp;
    opacityRef.current += (targetOpacity - opacityRef.current) * lerp;
    if (meshRef.current) {
      const breathe = reducedMotion ? 1 : 1 + Math.sin(state.clock.elapsedTime * 4) * 0.06 * (isHovered ? 1.5 : 1);
      meshRef.current.scale.setScalar(scaleRef.current * breathe);
      const mat = meshRef.current.material;
      mat.opacity = opacityRef.current;
    }
    if (ringRef.current && opacityRef.current > 0.01) {
      const ringMat = ringRef.current.material;
      if (reducedMotion) {
        ringRef.current.scale.set(scaleRef.current, scaleRef.current, 1);
        ringMat.opacity = opacityRef.current * 0.25;
      } else {
        const ringTime = state.clock.elapsedTime * 1.5 % 1;
        const ringScale = scaleRef.current * (1 + ringTime * 1.2);
        ringRef.current.scale.set(ringScale, ringScale, 1);
        ringMat.opacity = opacityRef.current * (1 - ringTime) * 0.4;
      }
    }
  });
  return /* @__PURE__ */ jsxs("group", { position, children: [
    /* @__PURE__ */ jsxs(
      "mesh",
      {
        ref: meshRef,
        onPointerOver: (e) => {
          e.stopPropagation();
          onHover(true);
        },
        onPointerOut: () => {
          onHover(false);
        },
        onClick: (e) => {
          e.stopPropagation();
          onClick();
        },
        children: [
          /* @__PURE__ */ jsx("boxGeometry", { args: [size, size, size] }),
          /* @__PURE__ */ jsx("meshBasicMaterial", { color: voxelColor, transparent: true, toneMapped: true, fog: false })
        ]
      }
    ),
    /* @__PURE__ */ jsxs("mesh", { ref: ringRef, rotation: [-Math.PI / 2, 0, 0], children: [
      /* @__PURE__ */ jsx("ringGeometry", { args: [ringInner, ringOuter, 32] }),
      /* @__PURE__ */ jsx(
        "meshBasicMaterial",
        {
          color: ringColor,
          transparent: true,
          depthWrite: false,
          side: THREE3.DoubleSide
        }
      )
    ] })
  ] });
}

// react/neuronShaders.ts
var NEURON_VERT = (
  /* glsl */
  `
attribute float instancePhase;
attribute float neuronIndex;

uniform float uTime;
uniform float uExpansion;
uniform float uSelectedNeuronIndex;
uniform vec3 uCenter;

varying float vMembranePotential;
varying float vSpikeIntensity;
varying float vIsSelected;

void main() {
  // Sub-threshold membrane oscillation, phase-offset per neuron.
  float oscillation = sin(uTime * 2.0 + instancePhase) * 0.5 + 0.5;
  vMembranePotential = oscillation;

  // Sparse, cheap "spike": the top of each neuron's own oscillation pops bright.
  // Schematic liveliness only \u2014 not measured spiking.
  vSpikeIntensity = smoothstep(0.93, 1.0, oscillation);

  vIsSelected = abs(neuronIndex - uSelectedNeuronIndex) < 0.1 ? 1.0 : 0.0;

  // Progressive reveal: a small core shows first, outer rows fade in with uExpansion.
  if (neuronIndex > 50.0) {
    float rowThreshold = (neuronIndex - 50.0) / 1200.0;
    float visibility = smoothstep(rowThreshold - 0.06, rowThreshold + 0.06, uExpansion);
    if (visibility <= 0.01) {
      gl_Position = vec4(0.0);
      return;
    }
  }

  // Cluster tightly at the hub centre when collapsed; spread to the full grid as
  // uExpansion goes to 1. The position attribute is the centered local grid offset.
  float scale = mix(0.06, 1.0, uExpansion);
  vec3 pos = uCenter + position * scale;

  float size = mix(1.0, 1.8, uExpansion);
  if (vIsSelected > 0.5) size = 6.5;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = size * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`
);
var NEURON_FRAG = (
  /* glsl */
  `
varying float vMembranePotential;
varying float vSpikeIntensity;
varying float vIsSelected;

uniform vec3 uBaseColor;
uniform vec3 uSpikeColor;

void main() {
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);
  if (dist > 0.5) discard;

  // Reconstruct the sphere normal across the point sprite.
  vec3 normal = vec3(center * 2.0, 0.0);
  normal.z = sqrt(max(0.0, 1.0 - dot(normal.xy, normal.xy)));
  normal = normalize(normal);

  vec3 lightDir = normalize(vec3(0.4, 0.6, 0.9));
  float diffuse = max(0.30, dot(normal, lightDir));
  vec3 baseColor = uBaseColor * diffuse * (0.72 + 0.28 * vMembranePotential);

  float fresnel = pow(1.0 - normal.z, 2.5);
  vec3 rim = uBaseColor * fresnel * (0.9 + 0.6 * vMembranePotential);

  float coreGlow = smoothstep(0.5, 0.0, dist);
  vec3 emissive = uBaseColor * coreGlow * (0.35 + 0.55 * vMembranePotential);

  vec3 color = baseColor + rim + emissive;

  // Spike flash \u2014 coloured bloom, capped ~1.15 luminance to stay under the
  // bloom bleach budget (design law).
  if (vSpikeIntensity > 0.001) {
    vec3 flash = mix(uSpikeColor, vec3(1.0), 0.35) * (1.10 + 0.05 * vSpikeIntensity);
    color = mix(color, flash, clamp(vSpikeIntensity * 1.1, 0.0, 1.0));
  }

  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  vec3 halfDir = normalize(lightDir + viewDir);
  float spec = pow(max(0.0, dot(normal, halfDir)), 22.0);
  color += vec3(0.35) * spec * (1.0 - 0.4 * vSpikeIntensity);

  float alpha = smoothstep(0.5, 0.46, dist);

  // Selected neuron \u2014 gold halo ring.
  if (vIsSelected > 0.5) {
    if (dist > 0.40) {
      float ring = smoothstep(0.40, 0.43, dist);
      color = mix(color, vec3(1.15, 1.0, 0.36), ring);
      alpha = 1.0;
    }
    color += vec3(0.25, 0.22, 0.05);
  }

  gl_FragColor = vec4(max(color, vec3(0.0)), alpha);
}
`
);
var NEURON_CLUSTER_SCALE = 0.06;
function neuronExpandedScale(expansion) {
  return NEURON_CLUSTER_SCALE + (1 - NEURON_CLUSTER_SCALE) * expansion;
}
function neuronLocalGrid(count, spacing = 0.4) {
  const side = Math.max(2, Math.ceil(Math.cbrt(count)));
  const totalCount = side * side * side;
  const positions = new Float32Array(totalCount * 3);
  const phases = new Float32Array(totalCount);
  const neuronIndex = new Float32Array(totalCount);
  const half = (side - 1) / 2;
  for (let i = 0; i < totalCount; i++) {
    const ix = i % side;
    const iy = Math.floor(i / side) % side;
    const iz = Math.floor(i / (side * side));
    positions[i * 3] = (ix - half) * spacing;
    positions[i * 3 + 1] = (iy - half) * spacing;
    positions[i * 3 + 2] = (iz - half) * spacing;
    phases[i] = i * 2.399963 % (Math.PI * 2);
    neuronIndex[i] = i;
  }
  return { positions, phases, neuronIndex, side, totalCount };
}
function ExpandableNeurons({
  count,
  center = [0, 0, 0],
  color,
  spikeColor,
  expanded,
  themeMode,
  reducedMotion = false,
  spacing = 0.4,
  selectedNeuronIndex = null,
  onHoverNeuron,
  onSelectNeuron
}) {
  const grid = useMemo(() => neuronLocalGrid(count, spacing), [count, spacing]);
  const geometry = useMemo(() => {
    const g = new THREE3.BufferGeometry();
    g.setAttribute("position", new THREE3.BufferAttribute(grid.positions, 3));
    g.setAttribute("instancePhase", new THREE3.BufferAttribute(grid.phases, 1));
    g.setAttribute("neuronIndex", new THREE3.BufferAttribute(grid.neuronIndex, 1));
    return g;
  }, [grid]);
  const resolvedSpike = spikeColor ?? (themeMode === "light" ? "#b45309" : "#fde68a");
  const material = useMemo(() => {
    return new THREE3.ShaderMaterial({
      vertexShader: NEURON_VERT,
      fragmentShader: NEURON_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uExpansion: { value: 0 },
        uSelectedNeuronIndex: { value: -1 },
        uCenter: { value: new THREE3.Vector3(center[0], center[1], center[2]) },
        uBaseColor: { value: new THREE3.Color(color) },
        uSpikeColor: { value: new THREE3.Color(resolvedSpike) }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE3.NormalBlending
    });
  }, [color, resolvedSpike]);
  const timeRef = useRef(0);
  const expansionRef = useRef(0);
  const opacityRef = useRef(0);
  useFrame((_, delta) => {
    if (!reducedMotion) timeRef.current += delta;
    const lerp = reducedMotion ? 1 : 0.15;
    const target = expanded ? 1 : 0;
    expansionRef.current += (target - expansionRef.current) * lerp;
    opacityRef.current += (target - opacityRef.current) * lerp;
    const u = material.uniforms;
    u.uTime.value = timeRef.current;
    u.uExpansion.value = expansionRef.current;
    u.uSelectedNeuronIndex.value = selectedNeuronIndex === null ? -1 : selectedNeuronIndex;
    u.uCenter.value.set(center[0], center[1], center[2]);
    material.opacity = opacityRef.current;
  });
  const interactive = expanded;
  return /* @__PURE__ */ jsx(
    "points",
    {
      geometry,
      material,
      onPointerOver: (e) => {
        if (!interactive || !onHoverNeuron) return;
        e.stopPropagation();
        if (e.index !== void 0) onHoverNeuron(e.index);
      },
      onPointerOut: () => {
        if (!interactive || !onHoverNeuron) return;
        onHoverNeuron(null);
      },
      onClick: (e) => {
        if (!interactive || !onSelectNeuron) return;
        e.stopPropagation();
        if (e.index !== void 0) onSelectNeuron(e.index);
      }
    }
  );
}
var PARTICLES_PER_EDGE = 4;
var MAX_PARTICLES = 4e3;
var LABEL_OUTLINE = "#030711";
var _dummy = new THREE3.Object3D();
var _color = new THREE3.Color();
var _dimTarget = new THREE3.Color("#030711");
var _a = new THREE3.Vector3();
var _b = new THREE3.Vector3();
var _box = new THREE3.Box3();
var _sphere = new THREE3.Sphere();
function dim(hex, amount) {
  return _color.set(hex).lerp(_dimTarget, amount).clone();
}
function KnowledgeGraph3DScene({
  nodes,
  edges,
  selectedId,
  query,
  onSelect,
  hoverId,
  onHover,
  controlsRef,
  labelColor = "#e2e8f0"
}) {
  const meshRef = useRef(null);
  const linesRef = useRef(null);
  const particlesRef = useRef(null);
  const labelGroupRef = useRef(null);
  const { camera } = useThree();
  useCursor(hoverId != null);
  const posMap = useRef(/* @__PURE__ */ new Map());
  const framedRef = useRef(false);
  const flyToRef = useRef(null);
  const { simNodes, simLinks, index } = useMemo(() => {
    const index2 = /* @__PURE__ */ new Map();
    const simNodes2 = nodes.map((n, i) => {
      index2.set(n.id, i);
      const prev = posMap.current.get(n.id);
      const spread = 90;
      return {
        id: n.id,
        r: n.radius,
        x: prev ? prev[0] : (Math.random() * 2 - 1) * spread,
        y: prev ? prev[1] : (Math.random() * 2 - 1) * spread,
        z: prev ? prev[2] : (Math.random() * 2 - 1) * spread
      };
    });
    const simLinks2 = edges.filter((e) => index2.has(e.source) && index2.has(e.target)).map((e) => ({ source: e.source, target: e.target }));
    return { simNodes: simNodes2, simLinks: simLinks2, index: index2 };
  }, [nodes, edges]);
  const neighbors = useMemo(() => {
    const m = /* @__PURE__ */ new Map();
    nodes.forEach((n) => m.set(n.id, /* @__PURE__ */ new Set()));
    edges.forEach((e) => {
      m.get(e.source)?.add(e.target);
      m.get(e.target)?.add(e.source);
    });
    return m;
  }, [nodes, edges]);
  const flowEdges = useMemo(
    () => edges.filter((e) => e.particles && index.has(e.source) && index.has(e.target)),
    [edges, index]
  );
  const particleCount = Math.min(MAX_PARTICLES, flowEdges.length * PARTICLES_PER_EDGE);
  const linePos = useMemo(() => new Float32Array(simLinks.length * 6), [simLinks]);
  const lineCol = useMemo(() => new Float32Array(simLinks.length * 6), [simLinks]);
  const simRef = useRef(null);
  useEffect(() => {
    const linkForce = forceLink(simLinks).id((d) => d.id).distance(34).strength(0.35);
    const sim = forceSimulation(simNodes, 3).force("charge", forceManyBody().strength(-140).distanceMax(600)).force("link", linkForce).force("center", forceCenter(0, 0, 0).strength(0.04)).force("collide", forceCollide((d) => d.r + 3).iterations(2)).alpha(1).alphaDecay(0.018).velocityDecay(0.42).stop();
    simRef.current = sim;
    framedRef.current = false;
    return () => {
      sim.stop();
      simRef.current = null;
    };
  }, [simNodes, simLinks]);
  const applyEmphasis = useCallback(() => {
    const mesh = meshRef.current;
    const focus = hoverId ?? selectedId;
    const focusSet = focus ? neighbors.get(focus) : null;
    const q = query.trim().toLowerCase();
    const isDimmed = (id, label) => {
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
    const attr = geom?.getAttribute("color");
    if (attr) attr.needsUpdate = true;
  }, [nodes, edges, index, neighbors, hoverId, selectedId, query, lineCol]);
  useEffect(() => {
    applyEmphasis();
  }, [applyEmphasis]);
  useEffect(() => {
    if (!selectedId) return;
    const i = index.get(selectedId);
    if (i == null) return;
    const n = simNodes[i];
    flyToRef.current = new THREE3.Vector3(n.x, n.y, n.z);
  }, [selectedId, index, simNodes]);
  useFrame((_, delta) => {
    const sim = simRef.current;
    const mesh = meshRef.current;
    if (!sim || !mesh) return;
    if (sim.alpha() > 8e-3) sim.tick();
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
    const posAttr = linesRef.current?.geometry.getAttribute("position");
    if (posAttr) posAttr.needsUpdate = true;
    const pmesh = particlesRef.current;
    if (pmesh && particleCount > 0) {
      const speed = 0.28;
      const base = performance.now() / 1e3 * speed;
      let p = 0;
      for (let fe = 0; fe < flowEdges.length && p < particleCount; fe++) {
        const e = flowEdges[fe];
        const s = simNodes[index.get(e.source)];
        const t = simNodes[index.get(e.target)];
        _a.set(s.x ?? 0, s.y ?? 0, s.z ?? 0);
        _b.set(t.x ?? 0, t.y ?? 0, t.z ?? 0);
        for (let q = 0; q < PARTICLES_PER_EDGE && p < particleCount; q++) {
          const frac = ((base + q / PARTICLES_PER_EDGE) % 1 + 1) % 1;
          _dummy.position.copy(_a).lerp(_b, frac);
          _dummy.scale.setScalar(1.3);
          _dummy.updateMatrix();
          pmesh.setMatrixAt(p, _dummy.matrix);
          p++;
        }
      }
      pmesh.instanceMatrix.needsUpdate = true;
    }
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
    if (flyToRef.current && controls) {
      controls.target.lerp(flyToRef.current, Math.min(1, delta * 3));
      if (controls.target.distanceTo(flyToRef.current) < 0.5) flyToRef.current = null;
      controls.update();
    }
  });
  const focusLabel = useMemo(() => {
    const focus = hoverId ?? selectedId;
    return focus ? nodes.find((n) => n.id === focus)?.label ?? "" : "";
  }, [hoverId, selectedId, nodes]);
  const handleMove = useCallback(
    (e) => {
      e.stopPropagation();
      if (e.instanceId != null && e.instanceId < nodes.length) onHover(nodes[e.instanceId].id);
    },
    [nodes, onHover]
  );
  const handleOut = useCallback(() => onHover(null), [onHover]);
  const handleClick = useCallback(
    (e) => {
      e.stopPropagation();
      if (e.instanceId != null && e.instanceId < nodes.length) onSelect(nodes[e.instanceId].id);
    },
    [nodes, onSelect]
  );
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs(
      "instancedMesh",
      {
        ref: meshRef,
        args: [void 0, void 0, Math.max(1, nodes.length)],
        onPointerMove: handleMove,
        onPointerOut: handleOut,
        onClick: handleClick,
        children: [
          /* @__PURE__ */ jsx("sphereGeometry", { args: [1, 20, 20] }),
          /* @__PURE__ */ jsx("meshBasicMaterial", { toneMapped: false })
        ]
      },
      `nodes-${nodes.length}`
    ),
    /* @__PURE__ */ jsxs("lineSegments", { ref: linesRef, children: [
      /* @__PURE__ */ jsxs("bufferGeometry", { children: [
        /* @__PURE__ */ jsx("bufferAttribute", { attach: "attributes-position", args: [linePos, 3] }),
        /* @__PURE__ */ jsx("bufferAttribute", { attach: "attributes-color", args: [lineCol, 3] })
      ] }),
      /* @__PURE__ */ jsx(
        "lineBasicMaterial",
        {
          vertexColors: true,
          transparent: true,
          opacity: 0.75,
          toneMapped: false,
          depthWrite: false,
          blending: THREE3.AdditiveBlending
        }
      )
    ] }, `lines-${simLinks.length}`),
    particleCount > 0 ? /* @__PURE__ */ jsxs(
      "instancedMesh",
      {
        ref: particlesRef,
        args: [void 0, void 0, particleCount],
        children: [
          /* @__PURE__ */ jsx("sphereGeometry", { args: [0.6, 6, 6] }),
          /* @__PURE__ */ jsx(
            "meshBasicMaterial",
            {
              color: "#8fd3ff",
              toneMapped: false,
              transparent: true,
              opacity: 0.9,
              blending: THREE3.AdditiveBlending
            }
          )
        ]
      },
      `p-${particleCount}`
    ) : null,
    /* @__PURE__ */ jsx("group", { ref: labelGroupRef, visible: false, children: /* @__PURE__ */ jsx(Billboard, { children: /* @__PURE__ */ jsx(
      Text,
      {
        fontSize: 7,
        color: labelColor,
        anchorX: "center",
        anchorY: "bottom",
        outlineWidth: 0.4,
        outlineColor: LABEL_OUTLINE,
        maxWidth: 160,
        children: focusLabel
      }
    ) }) })
  ] });
}
function VizSpecRenderer({
  spec,
  renderScene,
  skillId,
  active = true,
  activePalette,
  onError
}) {
  if (skillId) {
    const gated = validateSkillInvocation(skillId, spec);
    if (!gated.ok) {
      const messages = gated.errors.map((e) => `${e.path}: ${e.message}`);
      onError?.(messages);
      return /* @__PURE__ */ jsxs("div", { role: "alert", className: "cortexel-vizspec-error", children: [
        /* @__PURE__ */ jsxs("strong", { children: [
          "Invalid skill invocation (",
          skillId,
          ")"
        ] }),
        /* @__PURE__ */ jsx("ul", { children: messages.map((e, i) => /* @__PURE__ */ jsx("li", { children: e }, i)) })
      ] });
    }
    const palette2 = gated.spec.palette ? getPalette(gated.spec.palette) : activePalette ?? getPalette("crameri");
    return /* @__PURE__ */ jsx(
      SceneFrame,
      {
        scene: gated.scene,
        themeMode: gated.spec.themeMode,
        mode: gated.spec.mode,
        camera: gated.spec.camera,
        palette: palette2,
        caption: gated.caption,
        active,
        renderScene
      }
    );
  }
  const result = validateVizSpec(spec);
  if (!result.ok) {
    onError?.(result.errors);
    return /* @__PURE__ */ jsxs("div", { role: "alert", className: "cortexel-vizspec-error", children: [
      /* @__PURE__ */ jsx("strong", { children: "Invalid VizSpec" }),
      /* @__PURE__ */ jsx("ul", { children: result.errors.map((e, i) => /* @__PURE__ */ jsx("li", { children: e }, i)) })
    ] });
  }
  const { scene, themeMode, mode, camera, provenance, palette: paletteHint } = result.spec;
  const caption = requiresHonestyCaption(provenance) ? defaultHonestyCaption(provenance) : null;
  const palette = paletteHint ? getPalette(paletteHint) : activePalette ?? getPalette("crameri");
  return /* @__PURE__ */ jsx(
    SceneFrame,
    {
      scene,
      themeMode,
      mode,
      camera,
      palette,
      caption,
      active,
      renderScene
    }
  );
}
function SceneFrame({
  scene,
  themeMode,
  mode,
  camera,
  palette,
  caption,
  active,
  renderScene
}) {
  if (mode === "export") {
    return /* @__PURE__ */ jsx("div", { role: "status", className: "cortexel-vizspec-export-unsupported", children: "Headless export rendering is not available in this build. Request an interactive render, or use the backend render endpoint once enabled." });
  }
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: "cortexel-vizspec",
      style: { position: "relative", width: "100%", height: "100%" },
      children: [
        renderScene({ scene, themeMode, active, camera, palette }),
        caption && /* @__PURE__ */ jsx(
          "div",
          {
            className: "cortexel-honesty-caption",
            role: "note",
            "aria-live": "polite",
            "aria-label": "Scientific provenance disclosure",
            style: {
              position: "absolute",
              left: 12,
              bottom: 12,
              maxWidth: "70%",
              padding: "4px 10px",
              borderRadius: 6,
              // Okabe-Ito amber on opaque dark — bloom-safe (DOM, not emissive).
              background: "rgba(20,22,28,0.92)",
              color: "#e69f00",
              fontSize: 12,
              lineHeight: 1.4,
              pointerEvents: "none"
            },
            children: caption
          }
        )
      ]
    }
  );
}

export { ExpandableNeurons, ExpandablePopulation, KnowledgeGraph3DScene, NEURON_CLUSTER_SCALE, NEURON_FRAG, NEURON_VERT, VizSpecRenderer, neuronExpandedScale, neuronLocalGrid, usePopulationExpand };
//# sourceMappingURL=chunk-VENTUELU.js.map
//# sourceMappingURL=chunk-VENTUELU.js.map