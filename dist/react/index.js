import {
  VizSpecRenderer
} from "../chunk-22ASKDTA.js";
import "../chunk-DXRNJDB7.js";
import {
  safeDiagnosticText
} from "../chunk-X23XMWZH.js";

// react/usePopulationExpand.ts
import { useCallback, useState } from "react";
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

// react/ExpandablePopulation.tsx
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { jsx, jsxs } from "react/jsx-runtime";
var MAX_POPULATION_SIZE = 1e4;
var FLOAT32_MAX = 34028234663852886e22;
function validatePopulationGeometry(position, size) {
  if (position.some((value) => !Number.isFinite(value) || Math.abs(value) > FLOAT32_MAX)) {
    throw new RangeError("population position must contain finite Float32-range coordinates");
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_POPULATION_SIZE) {
    throw new RangeError(
      `population size must be a positive finite number <= ${MAX_POPULATION_SIZE}`
    );
  }
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
  validatePopulationGeometry(position, size);
  const meshRef = useRef(null);
  const ringRef = useRef(null);
  const initialScale = isSelected ? 0 : isAnySelected ? 0.5 : 1;
  const initialOpacity = isSelected ? 0 : isAnySelected ? 0.05 : 1;
  const scaleRef = useRef(initialScale);
  const opacityRef = useRef(initialOpacity);
  const onHoverRef = useRef(onHover);
  useEffect(() => {
    onHoverRef.current = onHover;
  }, [onHover]);
  useEffect(() => () => onHoverRef.current(false), []);
  const colorObj = useMemo(() => new THREE.Color(color), [color]);
  const voxelColor = useMemo(() => colorObj.clone().multiplyScalar(0.82), [colorObj]);
  const ringColor = useMemo(
    () => themeMode === "light" ? colorObj.clone().multiplyScalar(0.8) : colorObj.clone(),
    // passive halo remains <= 1.0 (Design Law #2)
    [colorObj, themeMode]
  );
  const ringInner = size * 0.867;
  const ringOuter = size * 1.067;
  useLayoutEffect(() => {
    meshRef.current.scale.setScalar(scaleRef.current);
    meshRef.current.material.opacity = opacityRef.current;
    ringRef.current.scale.set(scaleRef.current, scaleRef.current, 1);
    ringRef.current.material.opacity = opacityRef.current > 0.01 ? opacityRef.current * 0.25 : 0;
  }, []);
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
    const lerp = reducedMotion ? 1 : 1 - Math.exp(-9.75 * Math.min(delta, 0.1));
    scaleRef.current += (targetScale - scaleRef.current) * lerp;
    opacityRef.current += (targetOpacity - opacityRef.current) * lerp;
    if (meshRef.current) {
      const breathe = reducedMotion || !isHovered ? 1 : 1 + Math.sin(state.clock.elapsedTime * 4) * 0.09;
      meshRef.current.scale.setScalar(scaleRef.current * breathe);
      const mat = meshRef.current.material;
      mat.opacity = opacityRef.current;
    }
    if (ringRef.current && opacityRef.current > 0.01) {
      const ringMat = ringRef.current.material;
      if (reducedMotion || !isHovered) {
        ringRef.current.scale.set(scaleRef.current, scaleRef.current, 1);
        ringMat.opacity = opacityRef.current * 0.25;
      } else {
        const ringTime = state.clock.elapsedTime * 1.5 % 1;
        const ringScale = scaleRef.current * (1 + ringTime * 1.2);
        ringRef.current.scale.set(ringScale, ringScale, 1);
        ringMat.opacity = opacityRef.current * (1 - ringTime) * 0.4;
      }
    } else if (ringRef.current) {
      ringRef.current.material.opacity = 0;
    }
    if (!reducedMotion && (isHovered || Math.abs(targetScale - scaleRef.current) > 1e-3 || Math.abs(targetOpacity - opacityRef.current) > 1e-3)) {
      state.invalidate();
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
          side: THREE.DoubleSide
        }
      )
    ] })
  ] });
}

// react/ExpandableNeurons.tsx
import { useFrame as useFrame2 } from "@react-three/fiber";
import { useEffect as useEffect2, useLayoutEffect as useLayoutEffect2, useMemo as useMemo2, useRef as useRef2 } from "react";
import * as THREE2 from "three";

// react/neuronShaders.ts
var NEURON_VERT = (
  /* glsl */
  `
attribute float neuronIndex;
attribute vec2 neuronActivity;

uniform float uExpansion;
uniform float uSelectedNeuronIndex;
uniform float uRevealCount;   // total neuron count \u2014 normalizes the reveal ramp

varying float vMembranePotential;
varying float vSpikeIntensity;
varying float vIsSelected;

void main() {
  // Caller-supplied normalized activity snapshot. Missing attributes are filled
  // with zeros by ExpandableNeurons \u2014 never synthesize scientific activity just
  // to make a measured figure look lively.
  vMembranePotential = clamp(neuronActivity.x, 0.0, 1.0);
  vSpikeIntensity = clamp(neuronActivity.y, 0.0, 1.0);

  vIsSelected = abs(neuronIndex - uSelectedNeuronIndex) < 0.1 ? 1.0 : 0.0;

  // Progressive reveal: a small core shows first, outer rows fade in with
  // uExpansion. The ramp is normalized by the ACTUAL neuron count (uRevealCount),
  // so the last row always reaches full visibility at uExpansion=1 \u2014 a fixed
  // divisor would silently clip every neuron past a hard-coded index.
  if (neuronIndex > 50.0) {
    float span = max(1.0, uRevealCount - 50.0);
    float rowThreshold = (neuronIndex - 50.0) / span;
    float visibility = smoothstep(rowThreshold - 0.06, rowThreshold + 0.06, uExpansion);
    if (visibility <= 0.01) {
      gl_PointSize = 0.0;
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }
  }

  // Cluster tightly at the hub centre when collapsed; spread to the full grid as
  // uExpansion goes to 1. The position attribute is the centered local grid offset.
  float size = mix(1.0, 1.8, uExpansion);
  if (vIsSelected > 0.5) size = 6.5;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
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
uniform float uOpacity;   // cluster\u2192grid fade-in (custom ShaderMaterial: not auto-applied)

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

  float coreGlow = 1.0 - smoothstep(0.0, 0.5, dist);
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

  float alpha = 1.0 - smoothstep(0.46, 0.5, dist);

  // Selected neuron \u2014 gold halo ring.
  if (vIsSelected > 0.5) {
    if (dist > 0.40) {
      float ring = smoothstep(0.40, 0.43, dist);
      color = mix(color, vec3(1.15, 1.0, 0.36), ring);
      alpha = 1.0;
    }
    color += vec3(0.25, 0.22, 0.05);
  }

  // A raw ShaderMaterial does NOT auto-multiply by material.opacity, so the
  // cluster\u2192grid fade must be applied explicitly here from the uOpacity uniform.
  float outputCeiling = (vSpikeIntensity > 0.001 || vIsSelected > 0.5) ? 1.15 : 1.0;
  gl_FragColor = vec4(clamp(color, vec3(0.0), vec3(outputCeiling)), alpha * uOpacity);
}
`
);

// react/ExpandableNeurons.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
var NEURON_CLUSTER_SCALE = 0.06;
var MAX_NEURON_POINTS = 1e6;
var MAX_INTERACTIVE_NEURON_POINTS = 25e3;
var FLOAT32_MAX2 = 34028234663852886e22;
function neuronExpandedScale(expansion) {
  if (!Number.isFinite(expansion)) {
    throw new RangeError("expansion must be a finite number");
  }
  const t = Math.min(1, Math.max(0, expansion));
  return NEURON_CLUSTER_SCALE + (1 - NEURON_CLUSTER_SCALE) * t;
}
function neuronLocalGrid(count, spacing = 0.4) {
  if (!Number.isSafeInteger(count) || count < 0 || count > MAX_NEURON_POINTS) {
    throw new RangeError(
      `count must be a non-negative safe integer <= ${MAX_NEURON_POINTS}`
    );
  }
  if (!Number.isFinite(spacing) || spacing <= 0) {
    throw new RangeError("spacing must be a positive finite number");
  }
  const side = count === 0 ? 0 : Math.ceil(Math.cbrt(count));
  const totalCount = count;
  const positions = new Float32Array(count * 3);
  const neuronIndex = new Float32Array(count);
  const half = (side - 1) / 2;
  if (side > 1 && spacing > FLOAT32_MAX2 / half) {
    throw new RangeError("spacing would overflow Float32 neuron positions");
  }
  let sumX = 0;
  let sumY = 0;
  let sumZ = 0;
  for (let i = 0; i < totalCount; i++) {
    const ix = i % side;
    const iy = Math.floor(i / side) % side;
    const iz = Math.floor(i / (side * side));
    positions[i * 3] = (ix - half) * spacing;
    positions[i * 3 + 1] = (iy - half) * spacing;
    positions[i * 3 + 2] = (iz - half) * spacing;
    sumX += positions[i * 3];
    sumY += positions[i * 3 + 1];
    sumZ += positions[i * 3 + 2];
    neuronIndex[i] = i;
  }
  if (totalCount > 0) {
    const meanX = sumX / totalCount;
    const meanY = sumY / totalCount;
    const meanZ = sumZ / totalCount;
    for (let i = 0; i < totalCount; i++) {
      positions[i * 3] -= meanX;
      positions[i * 3 + 1] -= meanY;
      positions[i * 3 + 2] -= meanZ;
      if (!Number.isFinite(positions[i * 3]) || !Number.isFinite(positions[i * 3 + 1]) || !Number.isFinite(positions[i * 3 + 2])) {
        throw new RangeError("neuron positions exceed the finite Float32 range");
      }
    }
  }
  return { positions, neuronIndex, side, totalCount };
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
  membraneIntensity,
  spikeIntensity,
  onHoverNeuron,
  onSelectNeuron
}) {
  if (!Array.isArray(center) || center.length !== 3 || center.some((value) => !Number.isFinite(value) || Math.abs(value) > FLOAT32_MAX2)) {
    throw new RangeError("center must be an exact finite Float32-range xyz tuple");
  }
  if (selectedNeuronIndex !== null && (!Number.isSafeInteger(selectedNeuronIndex) || selectedNeuronIndex < 0 || selectedNeuronIndex >= count)) {
    throw new RangeError("selectedNeuronIndex must reference a rendered neuron");
  }
  const interactive = onHoverNeuron !== void 0 || onSelectNeuron !== void 0;
  if (interactive && count > MAX_INTERACTIVE_NEURON_POINTS) {
    throw new RangeError(
      `interactive point picking is limited to ${MAX_INTERACTIVE_NEURON_POINTS} neurons; omit callbacks or use indexed/GPU picking`
    );
  }
  const grid = useMemo2(() => neuronLocalGrid(count, spacing), [count, spacing]);
  const activity = useMemo2(() => {
    for (const [label, values] of [
      ["membraneIntensity", membraneIntensity],
      ["spikeIntensity", spikeIntensity]
    ]) {
      if (values !== void 0 && values.length !== count) {
        throw new RangeError(`${label} length (${values.length}) must match count (${count})`);
      }
    }
    const packed = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const membrane = membraneIntensity?.[i] ?? 0;
      const spike = spikeIntensity?.[i] ?? 0;
      if (!Number.isFinite(membrane) || membrane < 0 || membrane > 1 || !Number.isFinite(spike) || spike < 0 || spike > 1) {
        throw new RangeError(
          `neuron activity at index ${i} must contain finite values in [0, 1]`
        );
      }
      packed[i * 2] = membrane;
      packed[i * 2 + 1] = spike;
    }
    return packed;
  }, [count, membraneIntensity, spikeIntensity]);
  const pointsRef = useRef2(null);
  const previousExpandedRef = useRef2(expanded);
  const onHoverRef = useRef2(onHoverNeuron);
  useEffect2(() => {
    onHoverRef.current = onHoverNeuron;
  }, [onHoverNeuron]);
  useEffect2(() => () => onHoverRef.current?.(null), []);
  useEffect2(() => {
    if (previousExpandedRef.current && !expanded) onHoverNeuron?.(null);
    previousExpandedRef.current = expanded;
  }, [expanded, onHoverNeuron]);
  const geometry = useMemo2(() => {
    const g = new THREE2.BufferGeometry();
    g.setAttribute("position", new THREE2.BufferAttribute(grid.positions, 3));
    g.setAttribute("neuronIndex", new THREE2.BufferAttribute(grid.neuronIndex, 1));
    g.setAttribute("neuronActivity", new THREE2.BufferAttribute(activity, 2));
    return g;
  }, [grid, activity]);
  useEffect2(() => () => geometry.dispose(), [geometry]);
  const resolvedSpike = spikeColor ?? (themeMode === "light" ? "#b45309" : "#fde68a");
  const material = useMemo2(() => {
    return new THREE2.ShaderMaterial({
      vertexShader: NEURON_VERT,
      fragmentShader: NEURON_FRAG,
      uniforms: {
        uExpansion: { value: 0 },
        uSelectedNeuronIndex: { value: -1 },
        uRevealCount: { value: grid.totalCount },
        uOpacity: { value: 0 },
        uBaseColor: { value: new THREE2.Color(color) },
        uSpikeColor: { value: new THREE2.Color(resolvedSpike) }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE2.NormalBlending
    });
  }, [color, resolvedSpike]);
  useEffect2(() => () => material.dispose(), [material]);
  const initiallyExpanded = expanded && reducedMotion;
  const expansionRef = useRef2(initiallyExpanded ? 1 : 0);
  const opacityRef = useRef2(initiallyExpanded ? 1 : 0);
  useLayoutEffect2(() => {
    pointsRef.current?.scale.setScalar(neuronExpandedScale(expansionRef.current));
    material.uniforms.uExpansion.value = expansionRef.current;
    material.uniforms.uOpacity.value = opacityRef.current;
    material.uniforms.uSelectedNeuronIndex.value = selectedNeuronIndex === null ? -1 : selectedNeuronIndex;
  }, [geometry, material, selectedNeuronIndex]);
  useFrame2((state, delta) => {
    const lerp = reducedMotion ? 1 : 1 - Math.exp(-9.75 * Math.min(delta, 0.1));
    const target = expanded ? 1 : 0;
    expansionRef.current += (target - expansionRef.current) * lerp;
    opacityRef.current += (target - opacityRef.current) * lerp;
    const u = material.uniforms;
    u.uExpansion.value = expansionRef.current;
    u.uSelectedNeuronIndex.value = selectedNeuronIndex === null ? -1 : selectedNeuronIndex;
    u.uRevealCount.value = grid.totalCount;
    u.uOpacity.value = opacityRef.current;
    pointsRef.current?.scale.setScalar(neuronExpandedScale(expansionRef.current));
    if (!reducedMotion && (Math.abs(target - expansionRef.current) > 1e-3 || Math.abs(target - opacityRef.current) > 1e-3)) {
      state.invalidate();
    }
  });
  return /* @__PURE__ */ jsx2(
    "points",
    {
      ref: pointsRef,
      geometry,
      material,
      position: center,
      ...onHoverNeuron ? {
        onPointerOver: (e) => {
          if (expansionRef.current < 0.98) return;
          e.stopPropagation();
          if (e.index !== void 0) onHoverNeuron(e.index);
        },
        onPointerOut: () => onHoverNeuron(null)
      } : {},
      ...onSelectNeuron ? {
        onClick: (e) => {
          if (expansionRef.current < 0.98) return;
          e.stopPropagation();
          if (e.index !== void 0) onSelectNeuron(e.index);
        }
      } : {}
    }
  );
}

// react/SelectionA11yControls.tsx
import { useEffect as useEffect3, useState as useState2 } from "react";
import { Fragment, jsx as jsx3, jsxs as jsxs2 } from "react/jsx-runtime";
function PopulationA11yList({
  populations,
  selectedId,
  onSelect,
  label = "Neural populations"
}) {
  return /* @__PURE__ */ jsx3("section", { "aria-label": safeDiagnosticText(label, 240), children: populations.length === 0 ? /* @__PURE__ */ jsx3("p", { role: "status", children: "No populations are available." }) : /* @__PURE__ */ jsx3("ul", { children: populations.map((population) => /* @__PURE__ */ jsxs2("li", { children: [
    /* @__PURE__ */ jsx3(
      "button",
      {
        type: "button",
        disabled: population.disabled,
        "aria-pressed": selectedId === population.id,
        onClick: () => onSelect(population.id),
        style: { minWidth: 44, minHeight: 44 },
        children: safeDiagnosticText(population.label, 240)
      }
    ),
    population.description && /* @__PURE__ */ jsxs2("span", { children: [
      " ",
      safeDiagnosticText(population.description, 500)
    ] })
  ] }, population.id)) }) });
}
var DEFAULT_NEURON_A11Y_PAGE_SIZE = 50;
var MAX_NEURON_A11Y_PAGE_SIZE = 200;
function NeuronA11yPager({
  count,
  selectedIndex,
  onSelect,
  pageSize = DEFAULT_NEURON_A11Y_PAGE_SIZE,
  getLabel = (index) => `Neuron ${index + 1}`,
  label = "Neurons"
}) {
  if (!Number.isSafeInteger(count) || count < 0 || count > MAX_NEURON_POINTS) {
    throw new RangeError(`count must be a non-negative safe integer <= ${MAX_NEURON_POINTS}`);
  }
  if (selectedIndex !== null && (!Number.isSafeInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= count)) {
    throw new RangeError("selectedIndex must reference an available neuron");
  }
  const safePageSize = Number.isSafeInteger(pageSize) ? Math.min(MAX_NEURON_A11Y_PAGE_SIZE, Math.max(1, pageSize)) : DEFAULT_NEURON_A11Y_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(count / safePageSize));
  const [page, setPage] = useState2(
    selectedIndex === null ? 0 : Math.floor(selectedIndex / safePageSize)
  );
  const currentPage = Math.min(page, pageCount - 1);
  useEffect3(() => {
    if (selectedIndex !== null) setPage(Math.floor(selectedIndex / safePageSize));
    else setPage((value) => Math.min(value, pageCount - 1));
  }, [selectedIndex, safePageSize, pageCount]);
  const start = currentPage * safePageSize;
  const end = Math.min(count, start + safePageSize);
  return /* @__PURE__ */ jsx3("section", { "aria-label": safeDiagnosticText(label, 240), children: count === 0 ? /* @__PURE__ */ jsx3("p", { role: "status", children: "No neurons are available." }) : /* @__PURE__ */ jsxs2(Fragment, { children: [
    /* @__PURE__ */ jsx3("ul", { children: Array.from({ length: end - start }, (_, offset) => start + offset).map((index) => /* @__PURE__ */ jsx3("li", { children: /* @__PURE__ */ jsx3(
      "button",
      {
        type: "button",
        "aria-pressed": selectedIndex === index,
        onClick: () => onSelect(index),
        style: { minWidth: 44, minHeight: 44 },
        children: safeDiagnosticText(getLabel(index), 240)
      }
    ) }, index)) }),
    pageCount > 1 && /* @__PURE__ */ jsxs2("nav", { "aria-label": "Neuron pages", children: [
      /* @__PURE__ */ jsxs2("p", { "aria-live": "polite", children: [
        "Neuron page ",
        currentPage + 1,
        " of ",
        pageCount
      ] }),
      /* @__PURE__ */ jsx3(
        "button",
        {
          type: "button",
          disabled: currentPage === 0,
          onClick: () => setPage((value) => Math.max(0, value - 1)),
          style: { minWidth: 44, minHeight: 44 },
          children: "Previous neurons"
        }
      ),
      /* @__PURE__ */ jsx3(
        "button",
        {
          type: "button",
          disabled: currentPage + 1 >= pageCount,
          onClick: () => setPage((value) => Math.min(pageCount - 1, value + 1)),
          style: { minWidth: 44, minHeight: 44 },
          children: "Next neurons"
        }
      )
    ] })
  ] }) });
}
export {
  DEFAULT_NEURON_A11Y_PAGE_SIZE,
  ExpandableNeurons,
  ExpandablePopulation,
  MAX_INTERACTIVE_NEURON_POINTS,
  MAX_NEURON_A11Y_PAGE_SIZE,
  MAX_NEURON_POINTS,
  MAX_POPULATION_SIZE,
  NEURON_CLUSTER_SCALE,
  NEURON_FRAG,
  NEURON_VERT,
  NeuronA11yPager,
  PopulationA11yList,
  VizSpecRenderer,
  neuronExpandedScale,
  neuronLocalGrid,
  usePopulationExpand,
  validatePopulationGeometry
};
//# sourceMappingURL=index.js.map