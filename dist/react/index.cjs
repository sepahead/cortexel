"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// react/index.ts
var react_exports = {};
__export(react_exports, {
  DEFAULT_NEURON_A11Y_PAGE_SIZE: () => DEFAULT_NEURON_A11Y_PAGE_SIZE,
  ExpandableNeurons: () => ExpandableNeurons,
  ExpandablePopulation: () => ExpandablePopulation,
  MAX_INTERACTIVE_NEURON_POINTS: () => MAX_INTERACTIVE_NEURON_POINTS,
  MAX_NEURON_A11Y_PAGE_SIZE: () => MAX_NEURON_A11Y_PAGE_SIZE,
  MAX_NEURON_POINTS: () => MAX_NEURON_POINTS,
  MAX_POPULATION_SIZE: () => MAX_POPULATION_SIZE,
  NEURON_CLUSTER_SCALE: () => NEURON_CLUSTER_SCALE,
  NEURON_FRAG: () => NEURON_FRAG,
  NEURON_VERT: () => NEURON_VERT,
  NeuronA11yPager: () => NeuronA11yPager,
  PopulationA11yList: () => PopulationA11yList,
  VizSpecRenderer: () => VizSpecRenderer,
  neuronExpandedScale: () => neuronExpandedScale,
  neuronLocalGrid: () => neuronLocalGrid,
  usePopulationExpand: () => usePopulationExpand,
  validatePopulationGeometry: () => validatePopulationGeometry
});
module.exports = __toCommonJS(react_exports);

// react/usePopulationExpand.ts
var import_react = require("react");
function usePopulationExpand(controlled) {
  const [localSelected, setLocalSelected] = (0, import_react.useState)(null);
  const [localHovered, setLocalHovered] = (0, import_react.useState)(null);
  const selectedPopId = controlled ? controlled.selectedPopId : localSelected;
  const hoveredPopId = controlled ? controlled.hoveredPopId : localHovered;
  const setSelectedPopId = controlled ? controlled.setSelectedPopId : setLocalSelected;
  const setHoveredPopId = controlled ? controlled.setHoveredPopId : setLocalHovered;
  const toggleSelected = (0, import_react.useCallback)(
    (id2) => setSelectedPopId(selectedPopId === id2 ? null : id2),
    [selectedPopId, setSelectedPopId]
  );
  const reset = (0, import_react.useCallback)(() => {
    setSelectedPopId(null);
    setHoveredPopId(null);
  }, [setSelectedPopId, setHoveredPopId]);
  return {
    selectedPopId,
    hoveredPopId,
    setSelectedPopId,
    setHoveredPopId,
    isSelected: (id2) => selectedPopId === id2,
    isHovered: (id2) => hoveredPopId === id2,
    isAnySelected: () => selectedPopId !== null,
    toggleSelected,
    reset
  };
}

// react/ExpandablePopulation.tsx
var import_fiber = require("@react-three/fiber");
var import_react2 = require("react");
var THREE = __toESM(require("three"), 1);
var import_jsx_runtime = require("react/jsx-runtime");
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
  const meshRef = (0, import_react2.useRef)(null);
  const ringRef = (0, import_react2.useRef)(null);
  const initialScale = isSelected ? 0 : isAnySelected ? 0.5 : 1;
  const initialOpacity = isSelected ? 0 : isAnySelected ? 0.05 : 1;
  const scaleRef = (0, import_react2.useRef)(initialScale);
  const opacityRef = (0, import_react2.useRef)(initialOpacity);
  const onHoverRef = (0, import_react2.useRef)(onHover);
  (0, import_react2.useEffect)(() => {
    onHoverRef.current = onHover;
  }, [onHover]);
  (0, import_react2.useEffect)(() => () => onHoverRef.current(false), []);
  const colorObj = (0, import_react2.useMemo)(() => new THREE.Color(color), [color]);
  const voxelColor = (0, import_react2.useMemo)(() => colorObj.clone().multiplyScalar(0.82), [colorObj]);
  const ringColor = (0, import_react2.useMemo)(
    () => themeMode === "light" ? colorObj.clone().multiplyScalar(0.8) : colorObj.clone(),
    // passive halo remains <= 1.0 (Design Law #2)
    [colorObj, themeMode]
  );
  const ringInner = size * 0.867;
  const ringOuter = size * 1.067;
  (0, import_react2.useLayoutEffect)(() => {
    meshRef.current.scale.setScalar(scaleRef.current);
    meshRef.current.material.opacity = opacityRef.current;
    ringRef.current.scale.set(scaleRef.current, scaleRef.current, 1);
    ringRef.current.material.opacity = opacityRef.current > 0.01 ? opacityRef.current * 0.25 : 0;
  }, []);
  (0, import_fiber.useFrame)((state, delta) => {
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("group", { position, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
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
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("boxGeometry", { args: [size, size, size] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meshBasicMaterial", { color: voxelColor, transparent: true, toneMapped: true, fog: false })
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("mesh", { ref: ringRef, rotation: [-Math.PI / 2, 0, 0], children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ringGeometry", { args: [ringInner, ringOuter, 32] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
var import_fiber2 = require("@react-three/fiber");
var import_react3 = require("react");
var THREE2 = __toESM(require("three"), 1);

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
var import_jsx_runtime2 = require("react/jsx-runtime");
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
  const grid = (0, import_react3.useMemo)(() => neuronLocalGrid(count, spacing), [count, spacing]);
  const activity = (0, import_react3.useMemo)(() => {
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
  const pointsRef = (0, import_react3.useRef)(null);
  const previousExpandedRef = (0, import_react3.useRef)(expanded);
  const onHoverRef = (0, import_react3.useRef)(onHoverNeuron);
  (0, import_react3.useEffect)(() => {
    onHoverRef.current = onHoverNeuron;
  }, [onHoverNeuron]);
  (0, import_react3.useEffect)(() => () => onHoverRef.current?.(null), []);
  (0, import_react3.useEffect)(() => {
    if (previousExpandedRef.current && !expanded) onHoverNeuron?.(null);
    previousExpandedRef.current = expanded;
  }, [expanded, onHoverNeuron]);
  const geometry = (0, import_react3.useMemo)(() => {
    const g = new THREE2.BufferGeometry();
    g.setAttribute("position", new THREE2.BufferAttribute(grid.positions, 3));
    g.setAttribute("neuronIndex", new THREE2.BufferAttribute(grid.neuronIndex, 1));
    g.setAttribute("neuronActivity", new THREE2.BufferAttribute(activity, 2));
    return g;
  }, [grid, activity]);
  (0, import_react3.useEffect)(() => () => geometry.dispose(), [geometry]);
  const resolvedSpike = spikeColor ?? (themeMode === "light" ? "#b45309" : "#fde68a");
  const material = (0, import_react3.useMemo)(() => {
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
  (0, import_react3.useEffect)(() => () => material.dispose(), [material]);
  const initiallyExpanded = expanded && reducedMotion;
  const expansionRef = (0, import_react3.useRef)(initiallyExpanded ? 1 : 0);
  const opacityRef = (0, import_react3.useRef)(initiallyExpanded ? 1 : 0);
  (0, import_react3.useLayoutEffect)(() => {
    pointsRef.current?.scale.setScalar(neuronExpandedScale(expansionRef.current));
    material.uniforms.uExpansion.value = expansionRef.current;
    material.uniforms.uOpacity.value = opacityRef.current;
    material.uniforms.uSelectedNeuronIndex.value = selectedNeuronIndex === null ? -1 : selectedNeuronIndex;
  }, [geometry, material, selectedNeuronIndex]);
  (0, import_fiber2.useFrame)((state, delta) => {
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
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
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
var import_react4 = require("react");

// core/safeRuntime.ts
function safeErrorMessage(error) {
  try {
    if (typeof error === "string") {
      return safeDiagnosticText(error, 240);
    }
    if (error !== null && (typeof error === "object" || typeof error === "function")) {
      const message = Reflect.get(error, "message");
      if (typeof message === "string") {
        return safeDiagnosticText(message, 240);
      }
    }
  } catch {
  }
  return "unknown error";
}
var PUBLIC_DIAGNOSTIC_LIMITS = Object.freeze({
  maxIssues: 32,
  maxPathLength: 240,
  maxMessageLength: 500,
  maxTotalLength: 8192,
  maxUnknownKeySamples: 8
});
var SAFE_DISPLAY_STRING_PATTERN = /^[^\u0000-\u001f\u061c\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]*$/u;
function clipText(value, max) {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1))}\u2026`;
}
function safeDiagnosticText(value, max) {
  const boundedSource = clipText(value, max);
  const escaped = boundedSource.replace(
    /[\u0000-\u001f\u061c\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`
  );
  return clipText(escaped, max);
}
function printablePathSegment(value) {
  try {
    return safeDiagnosticText(typeof value === "symbol" ? String(value) : `${value}`, 80);
  } catch {
    return "<unprintable>";
  }
}
function boundValidationIssue(issue) {
  const path = clipText(
    issue.path?.map(printablePathSegment).join(".") || "(root)",
    PUBLIC_DIAGNOSTIC_LIMITS.maxPathLength
  );
  let message;
  if (issue.code === "unrecognized_keys" && Array.isArray(issue.keys)) {
    const samples = issue.keys.slice(0, PUBLIC_DIAGNOSTIC_LIMITS.maxUnknownKeySamples).map((key) => {
      try {
        return safeDiagnosticText(
          JSON.stringify(clipText(typeof key === "string" ? key : String(key), 60)),
          80
        );
      } catch {
        return '"<unprintable>"';
      }
    });
    const omitted = issue.keys.length - samples.length;
    message = `unrecognized keys (${issue.keys.length}): ${samples.join(", ")}` + (omitted > 0 ? `; ${omitted} more omitted` : "");
  } else {
    message = typeof issue.message === "string" ? issue.message : "validation failed";
  }
  return {
    path,
    message: safeDiagnosticText(message, PUBLIC_DIAGNOSTIC_LIMITS.maxMessageLength)
  };
}
function formatValidationIssues(issues) {
  const output = [];
  let total = 0;
  const count = Math.min(issues.length, PUBLIC_DIAGNOSTIC_LIMITS.maxIssues);
  for (let index = 0; index < count; index++) {
    const bounded = boundValidationIssue(issues[index]);
    const line = `${bounded.path}: ${bounded.message}`;
    if (total + line.length > PUBLIC_DIAGNOSTIC_LIMITS.maxTotalLength) {
      output.push("(root): additional validation detail omitted by the diagnostic budget");
      return output;
    }
    output.push(line);
    total += line.length;
  }
  if (issues.length > count) {
    output.push(`(root): ${issues.length - count} additional validation issues omitted`);
  }
  return output;
}
function readOwnEnumerableDataProperty(input, key) {
  if (input === null || typeof input !== "object") return { kind: "absent" };
  const descriptor = Object.getOwnPropertyDescriptor(input, key);
  if (!descriptor) return { kind: "absent" };
  return "value" in descriptor && descriptor.enumerable ? { kind: "value", value: descriptor.value } : { kind: "invalid" };
}

// react/SelectionA11yControls.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
function PopulationA11yList({
  populations,
  selectedId,
  onSelect,
  label = "Neural populations"
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("section", { "aria-label": safeDiagnosticText(label, 240), children: populations.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { role: "status", children: "No populations are available." }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("ul", { children: populations.map((population) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("li", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
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
    population.description && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { children: [
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
  const [page, setPage] = (0, import_react4.useState)(
    selectedIndex === null ? 0 : Math.floor(selectedIndex / safePageSize)
  );
  const currentPage = Math.min(page, pageCount - 1);
  (0, import_react4.useEffect)(() => {
    if (selectedIndex !== null) setPage(Math.floor(selectedIndex / safePageSize));
    else setPage((value) => Math.min(value, pageCount - 1));
  }, [selectedIndex, safePageSize, pageCount]);
  const start = currentPage * safePageSize;
  const end = Math.min(count, start + safePageSize);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("section", { "aria-label": safeDiagnosticText(label, 240), children: count === 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { role: "status", children: "No neurons are available." }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("ul", { children: Array.from({ length: end - start }, (_, offset) => start + offset).map((index) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      "button",
      {
        type: "button",
        "aria-pressed": selectedIndex === index,
        onClick: () => onSelect(index),
        style: { minWidth: 44, minHeight: 44 },
        children: safeDiagnosticText(getLabel(index), 240)
      }
    ) }, index)) }),
    pageCount > 1 && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("nav", { "aria-label": "Neuron pages", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { "aria-live": "polite", children: [
        "Neuron page ",
        currentPage + 1,
        " of ",
        pageCount
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "button",
        {
          type: "button",
          disabled: currentPage === 0,
          onClick: () => setPage((value) => Math.max(0, value - 1)),
          style: { minWidth: 44, minHeight: 44 },
          children: "Previous neurons"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
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

// react/VizSpecRenderer.tsx
var import_react5 = require("react");

// core/provenance.ts
var CONSERVATIVE_PROVENANCE = Object.freeze({
  calibrated_posterior: false,
  advisory_only: true,
  is_paper_local_evidence: false,
  synthetic: false
});
var HONESTY_POLICY = Object.freeze({
  version: "2",
  calibratedPosteriorAccepted: false,
  captionRequiredWhenAny: Object.freeze([
    "synthetic=true",
    "calibrated_posterior=false",
    "advisory_only=true",
    "is_paper_local_evidence=false"
  ]),
  syntheticSourceMatch: Object.freeze({
    caseInsensitive: true,
    equals: Object.freeze(["synthetic_test"]),
    prefixes: Object.freeze(["synthetic"])
  }),
  precedence: Object.freeze([
    "synthetic",
    "advisory_only",
    "not_paper_local",
    "not_calibrated"
  ]),
  templates: Object.freeze({
    synthetic: "Schematic \u2014 illustrative synthetic data, not measured.",
    advisory_only: "Advisory \u2014 advisory evidence only; not a calibrated posterior.",
    not_paper_local: "Advisory \u2014 not paper-local evidence; candidate ranking only.",
    not_calibrated: "Illustrative \u2014 not a calibrated posterior."
  }),
  callerCaption: "append_only_unverified",
  callerCaptionLabel: "Caller note (unverified):",
  callerCaptionControls: "escape C0/C1, bidi, zero-width, and BOM controls",
  bidiIsolationRequired: true,
  weakSkillDisclosure: "prepend"
});
function requiresHonestyCaption(p) {
  return !!p.synthetic || !p.calibrated_posterior || p.advisory_only || !p.is_paper_local_evidence;
}
function mandatoryDisclosure(p) {
  if (p.synthetic || p.source.toLowerCase() === "synthetic_test" || p.source.toLowerCase().startsWith("synthetic")) {
    return HONESTY_POLICY.templates.synthetic;
  }
  if (p.advisory_only) {
    return HONESTY_POLICY.templates.advisory_only;
  }
  if (!p.is_paper_local_evidence) {
    return HONESTY_POLICY.templates.not_paper_local;
  }
  return HONESTY_POLICY.templates.not_calibrated;
}
function defaultHonestyCaption(p) {
  const disclosure = mandatoryDisclosure(p);
  const note = p.caption?.trim();
  return note ? `${disclosure} Caller note (unverified): ${safeDiagnosticText(note, 500)}` : disclosure;
}

// core/vizSpec.ts
var import_zod = require("zod");

// core/designLaws.ts
var SCENE_NAMES = Object.freeze([
  "live-activity",
  "cortical-column",
  "stdp",
  "spike-raster",
  "network-topology",
  "voltage-trace",
  "phase-plane",
  "brunel-network",
  "fi-curve",
  "isi-distribution",
  "psth",
  "weight-histogram",
  "knowledge-graph-3d"
]);

// core/vizSpec.ts
var CORTEXEL_SPEC_VERSION = "1.1.0";
var CORTEXEL_JSON_LIMITS = Object.freeze({
  maxDepth: 32,
  maxNodes: 5e5,
  maxObjectKeys: 1e4,
  maxStringLength: 1e5,
  maxTotalStringLength: 5e6
});
var CORTEXEL_JSON_POLICY = Object.freeze({
  finiteNumbersOnly: true,
  rejectNegativeZero: true,
  plainObjectsOnly: true,
  enumerableDataPropertiesOnly: true,
  rejectAccessors: true,
  rejectSymbolKeys: true,
  rejectSparseArrays: true,
  rejectNamedArrayProperties: true,
  rejectCircularReferences: true,
  rejectRawJson: true,
  duplicateObjectMemberNames: "reject before materialization",
  rawJsonParsingPrecondition: "detect duplicate member names in raw JSON text before converting to an object",
  rejectedObjectKeys: Object.freeze(["__proto__"])
});
var STRING_NORMALIZATION_POLICY = Object.freeze({
  version: "1",
  lengthModel: "ECMAScript UTF-16 code units",
  portableLengthKeyword: "x-cortexel-max-utf16-code-units",
  trimAlgorithm: "ECMA-262 String.prototype.trim / TrimString",
  trimCodePointsHex: Object.freeze([
    "0009-000D",
    "0020",
    "00A0",
    "1680",
    "2000-200A",
    "2028",
    "2029",
    "202F",
    "205F",
    "3000",
    "FEFF"
  ]),
  regexDialect: "ECMA-262 Unicode-aware regular expressions",
  unicodeNormalization: "none",
  wellFormedUnicodeOnly: true,
  displayStringPattern: SAFE_DISPLAY_STRING_PATTERN.source,
  displayStringControls: "reject C0/C1, bidi, zero-width, and BOM controls"
});
var NUMERIC_MODEL_POLICY = Object.freeze({
  version: "1",
  representation: "IEEE-754 binary64",
  coerceBeforeValidation: true,
  finiteOnly: true,
  negativeZeroRejected: true,
  integerIdentityFields: "safe integers only",
  constraintEvaluationUsesCoercedValues: true
});
var JSON_BUDGET_SEMANTICS = Object.freeze({
  version: "1",
  scope: "one snapshot of the complete invocation envelope",
  rootDepth: 0,
  nodeCount: "every scalar, array, and object value; property names are not nodes",
  objectKeyCount: "per object",
  stringLengthModel: "UTF-16 code units",
  totalStringLength: "all string values plus every object property name",
  repeatedReference: "counted once per JSON occurrence; cycles reject"
});
var JSON_PARAMS_PORTABLE_SCHEMA = Object.freeze({
  type: "object",
  maxProperties: CORTEXEL_JSON_LIMITS.maxObjectKeys,
  propertyNames: Object.freeze({
    type: "string",
    maxLength: CORTEXEL_JSON_LIMITS.maxStringLength,
    "x-cortexel-max-utf16-code-units": CORTEXEL_JSON_LIMITS.maxStringLength,
    not: Object.freeze({ const: "__proto__" })
  }),
  additionalProperties: true
});
var DECLARED_INPUTS_PORTABLE_SCHEMA = Object.freeze({
  type: "object",
  maxProperties: 64,
  propertyNames: Object.freeze({
    type: "string",
    minLength: 1,
    maxLength: 80,
    "x-cortexel-max-utf16-code-units": 80,
    allOf: Object.freeze([
      Object.freeze({ pattern: "^\\S(?:[\\s\\S]*\\S)?$" }),
      Object.freeze({ pattern: SAFE_DISPLAY_STRING_PATTERN.source })
    ])
  }),
  additionalProperties: Object.freeze({
    anyOf: Object.freeze([
      Object.freeze({
        type: "string",
        maxLength: 5e3,
        "x-cortexel-max-utf16-code-units": 5e3,
        pattern: SAFE_DISPLAY_STRING_PATTERN.source
      }),
      Object.freeze({ type: "number" }),
      Object.freeze({ type: "boolean", const: true })
    ])
  })
});
var ENVELOPE_NORMALIZATION_POLICY = Object.freeze({
  version: "1",
  evaluationOrder: Object.freeze([
    "parse/coerce every JSON number to IEEE-754 binary64",
    "validate and snapshot the raw envelope with exact-JSON budgets",
    "normalize fields carrying x-cortexel-normalize",
    "materialize envelope defaults",
    "validate the envelope JSON Schema",
    "validate skill params, provenance values, and portable constraints",
    "derive and display the mandatory honesty caption"
  ]),
  vizSpecDefaults: Object.freeze({
    params: Object.freeze({}),
    mode: "interactive",
    themeMode: "dark"
  }),
  honestyDefaults: Object.freeze({
    calibrated_posterior: false,
    advisory_only: true,
    is_paper_local_evidence: false,
    synthetic: false
  }),
  jsonSchemaDefaultsAreAnnotations: true,
  missingHonestyFlagsMustUseConservativeDefaults: true
});
var normalizedRecordKey = import_zod.z.string().min(1).max(80).regex(
  /^\S(?:[\s\S]*\S)?$/,
  "record keys must already be trimmed and contain a non-whitespace character"
).regex(SAFE_DISPLAY_STRING_PATTERN, "record keys must not contain display control characters");
function cloneExactJson(root) {
  const ancestors = /* @__PURE__ */ new WeakSet();
  let visited = 0;
  let totalStringLength = 0;
  const fail = (path, message) => ({
    ok: false,
    issue: { path, message }
  });
  function inspectString(value, path) {
    if (value.length > CORTEXEL_JSON_LIMITS.maxStringLength) {
      return {
        path,
        message: `JSON string exceeds ${CORTEXEL_JSON_LIMITS.maxStringLength} characters`
      };
    }
    totalStringLength += value.length;
    if (totalStringLength > CORTEXEL_JSON_LIMITS.maxTotalStringLength) {
      return {
        path,
        message: `JSON strings exceed ${CORTEXEL_JSON_LIMITS.maxTotalStringLength} total characters`
      };
    }
    for (let index = 0; index < value.length; index++) {
      const codeUnit = value.charCodeAt(index);
      if (codeUnit >= 55296 && codeUnit <= 56319) {
        const next = value.charCodeAt(index + 1);
        if (!(next >= 56320 && next <= 57343)) {
          return { path, message: "strings must not contain an unpaired high surrogate" };
        }
        index += 1;
      } else if (codeUnit >= 56320 && codeUnit <= 57343) {
        return { path, message: "strings must not contain an unpaired low surrogate" };
      }
    }
    return null;
  }
  function visit(value, path, depth) {
    visited += 1;
    if (visited > CORTEXEL_JSON_LIMITS.maxNodes) {
      return fail(path, `JSON value exceeds ${CORTEXEL_JSON_LIMITS.maxNodes} nodes`);
    }
    if (depth > CORTEXEL_JSON_LIMITS.maxDepth) {
      return fail(path, `JSON nesting exceeds ${CORTEXEL_JSON_LIMITS.maxDepth} levels`);
    }
    if (value === null || typeof value === "boolean") {
      return { ok: true, value };
    }
    if (typeof value === "string") {
      const issue = inspectString(value, path);
      return issue ? { ok: false, issue } : { ok: true, value };
    }
    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        return fail(path, "JSON numbers must be finite (NaN/Infinity are not allowed)");
      }
      return Object.is(value, -0) ? fail(path, "negative zero is not stable through JSON.stringify") : { ok: true, value };
    }
    if (typeof value !== "object") {
      return fail(path, `value of type '${typeof value}' is not JSON-serializable`);
    }
    const object = value;
    if (ancestors.has(object)) return fail(path, "circular JSON reference");
    ancestors.add(object);
    try {
      const isRawJson = JSON.isRawJSON;
      if (isRawJson?.(value)) {
        return fail(path, "JSON.rawJSON values are not literal objects and are not allowed");
      }
      if (Array.isArray(value)) {
        const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
        if (!lengthDescriptor || !("value" in lengthDescriptor) || !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0) {
          return fail(path, "JSON arrays must have an ordinary non-negative length");
        }
        const length = lengthDescriptor.value;
        if (length > CORTEXEL_JSON_LIMITS.maxNodes - visited) {
          return fail(path, `JSON value exceeds ${CORTEXEL_JSON_LIMITS.maxNodes} nodes`);
        }
        const ownKeys2 = Reflect.ownKeys(value);
        for (const key of ownKeys2) {
          if (key === "length") continue;
          if (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= length) {
            return fail(
              path,
              "JSON arrays may not carry symbol, named, or out-of-range properties"
            );
          }
        }
        const clone2 = new Array(length);
        for (let i = 0; i < length; i++) {
          const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
          if (!descriptor) {
            return fail([...path, i], "sparse arrays are not allowed in exact JSON");
          }
          if (!("value" in descriptor) || !descriptor.enumerable) {
            return fail(
              [...path, i],
              "JSON array entries must be enumerable data properties, not accessors"
            );
          }
          const nested = visit(descriptor.value, [...path, i], depth + 1);
          if (!nested.ok) return nested;
          clone2[i] = nested.value;
        }
        return { ok: true, value: clone2 };
      }
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) {
        return fail(path, "exact JSON must contain plain objects, not class instances");
      }
      const ownKeys = Reflect.ownKeys(value);
      if (ownKeys.some((key) => typeof key === "symbol")) {
        return fail(path, "JSON objects may not contain symbol keys");
      }
      const keys = ownKeys;
      if (keys.length > CORTEXEL_JSON_LIMITS.maxObjectKeys) {
        return fail(path, `JSON object exceeds ${CORTEXEL_JSON_LIMITS.maxObjectKeys} keys`);
      }
      const clone = {};
      for (const key of keys) {
        if (key === "__proto__") {
          return fail(
            [...path, key],
            "the '__proto__' key is not preserved by the runtime schema parser"
          );
        }
        const keyIssue = inspectString(key, [...path, key]);
        if (keyIssue) return { ok: false, issue: keyIssue };
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
          return fail(
            [...path, key],
            "JSON object fields must be enumerable data properties, not accessors"
          );
        }
        const nested = visit(descriptor.value, [...path, key], depth + 1);
        if (!nested.ok) return nested;
        Object.defineProperty(clone, key, {
          value: nested.value,
          enumerable: true,
          writable: true,
          configurable: true
        });
      }
      return { ok: true, value: clone };
    } finally {
      ancestors.delete(object);
    }
  }
  return visit(root, [], 0);
}
var JsonParamsSchema = import_zod.z.unknown().transform((params, ctx) => {
  const result = cloneExactJson(params);
  if (!result.ok) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      path: result.issue.path,
      message: result.issue.message
    });
    return import_zod.z.NEVER;
  }
  if (result.value === null || typeof result.value !== "object" || Array.isArray(result.value)) {
    ctx.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      message: "exact JSON envelope must be a plain object"
    });
    return import_zod.z.NEVER;
  }
  return result.value;
});
var ProvenanceSchema = import_zod.z.object({
  source: import_zod.z.string().trim().min(1).max(200).regex(SAFE_DISPLAY_STRING_PATTERN),
  calibrated_posterior: import_zod.z.literal(false).default(false),
  // fail-closed + portable
  advisory_only: import_zod.z.boolean().default(true),
  is_paper_local_evidence: import_zod.z.boolean().default(false),
  caption: import_zod.z.string().trim().max(500).regex(SAFE_DISPLAY_STRING_PATTERN).optional(),
  /** Machine-checkable record of the inputs an agent declared. Keys are
   *  open here (lenient envelope) — validateSkillInvocation enforces the
   *  closed ProvenanceKey set a skill demands, so an unknown key surfaces as a
   *  clear missing_provenance error rather than zod's opaque invalid_key.
   *  The strict gate closes the key set, validates every present known value,
   *  and checks portable params↔claim consistency; factual truth remains the
   *  producer's responsibility. */
  declared_inputs: JsonParamsSchema.pipe(
    import_zod.z.record(
      normalizedRecordKey,
      import_zod.z.union([
        import_zod.z.string().max(5e3).regex(SAFE_DISPLAY_STRING_PATTERN),
        import_zod.z.number(),
        import_zod.z.literal(true)
      ])
    )
  ).refine((inputs) => Object.keys(inputs).length <= 64, {
    message: "declared_inputs may contain at most 64 keys"
  }).optional(),
  /** Explicit synthetic/illustrative discriminator — forces the schematic
   *  caption regardless of the other flags. */
  synthetic: import_zod.z.boolean().default(false)
}).strict();
var VizSpecSchema = import_zod.z.object({
  scene: import_zod.z.enum(SCENE_NAMES),
  /** Optional self-describing skill id (e.g. 'nest.spike_raster'). When present,
   *  a stored spec is independently re-validatable and its honesty caption is
   *  deterministic: validateSkillInvocation cross-checks it, and VizSpecRenderer
   *  uses it when no explicit `skillId` prop is passed. Scene→skill is many-to-one
   *  (voltage-trace ← voltage_trace AND astrocyte_dynamics), so the scene alone
   *  cannot recover the skill — this field closes that gap. */
  skill: import_zod.z.string().trim().min(1).max(80).optional(),
  /** Optional contract version this spec targets (see CORTEXEL_SPEC_VERSION). */
  specVersion: import_zod.z.literal(CORTEXEL_SPEC_VERSION).optional(),
  // Scene-specific data/options. The envelope path guarantees bounded literal
  // JSON; the strict agent path `validateSkillInvocation` additionally enforces
  // the per-skill shape and cross-field invariants before render.
  params: JsonParamsSchema.default({}),
  mode: import_zod.z.enum(["interactive", "export"]).default("interactive"),
  themeMode: import_zod.z.enum(["dark", "light"]).default("dark"),
  camera: import_zod.z.enum(["default", "top", "side", "close", "cinematic"]).optional(),
  /** Optional palette hint — an agent can request a named semantic palette
   *  (e.g. 'crameri', 'okabe-ito'). On the strict skill path an unregistered name
   *  is rejected with 'unknown_palette'; on the lenient validateVizSpec path an
   *  unregistered name is tolerated and getPalette falls back to the default (with
   *  a dev-mode warning). When absent, the host's active palette is used. */
  palette: import_zod.z.string().trim().min(1).max(60).optional(),
  provenance: ProvenanceSchema
}).strict();
function validateVizSpec(input) {
  try {
    const exact = JsonParamsSchema.safeParse(input);
    if (!exact.success) {
      return {
        ok: false,
        errors: formatValidationIssues(exact.error.issues)
      };
    }
    const result = VizSpecSchema.safeParse(exact.data);
    if (result.success) return { ok: true, spec: result.data };
    return {
      ok: false,
      errors: formatValidationIssues(result.error.issues)
    };
  } catch (error) {
    return {
      ok: false,
      errors: [
        `(root): validation could not safely inspect the payload: ${safeErrorMessage(error)}`
      ]
    };
  }
}

// core/skills/registry.ts
var import_zod3 = require("zod");

// core/skills/skillIds.ts
var NEST_SKILL_IDS = Object.freeze([
  "nest.voltage_trace",
  "nest.spike_raster",
  "nest.rate_response",
  "nest.connectivity_matrix",
  "nest.spatial_2d",
  "nest.spatial_3d",
  "nest.plasticity_dynamics",
  "nest.phase_plane",
  "nest.correlogram",
  "nest.stimulus_response",
  "nest.astrocyte_dynamics",
  "nest.compartmental_dynamics",
  "nest.animation_replay",
  "corpus.knowledge_graph"
]);
var SKILL_IDS = NEST_SKILL_IDS;
var NEST_DEVICE_FAMILIES = Object.freeze([
  "multimeter",
  "spike_recorder",
  "get_connections",
  "get_position",
  "weight_recorder",
  "computed",
  // no NEST device — numerically derived (phase plane, replay frames)
  "corpus"
  // no NEST device — corpus/KG structural graph (papers, models, families)
]);
function isSkillId(value) {
  return typeof value === "string" && SKILL_IDS.includes(value);
}
var VALID_RENDERER_ROUTES = Object.freeze([
  "media.trace_figure",
  "media.model_graph",
  "media.webgl_scene",
  "media.react_fiber_scene",
  "media.manim_storyboard",
  "media.*",
  "matplotlib",
  "d3",
  "three",
  "fiber",
  "manim"
]);

// core/skills/params.ts
var import_zod2 = require("zod");
var PARAM_LIMITS = Object.freeze({
  // Inline JSON is defensively cloned and schema-validated more than once at
  // the trust boundary. Larger recordings must be decimated/aggregated or
  // referenced out-of-band instead of freezing a browser render.
  maxSamples: 5e4,
  maxSeries: 256,
  maxSpatialObjects: 5e4,
  maxGraphNodes: 1e3,
  maxGraphEdges: 4e3
});
var FLOAT32_MAX3 = 34028234663852886e22;
var timeArray = import_zod2.z.array(import_zod2.z.number()).max(PARAM_LIMITS.maxSamples);
var gpuNumber = import_zod2.z.number().min(-FLOAT32_MAX3, "value exceeds the finite Float32 range used by render buffers").max(FLOAT32_MAX3, "value exceeds the finite Float32 range used by render buffers");
var gpuArray = import_zod2.z.array(gpuNumber).max(PARAM_LIMITS.maxSamples);
var idArray = import_zod2.z.array(
  import_zod2.z.number().int("node/sender ids must be integers").nonnegative("node/sender ids must be non-negative").max(Number.MAX_SAFE_INTEGER, "node/sender ids must be safe integers")
).max(PARAM_LIMITS.maxSamples);
var displayText = (max) => import_zod2.z.string().trim().min(1).max(max).regex(SAFE_DISPLAY_STRING_PATTERN, "display text must not contain control or bidi characters").meta({ "x-cortexel-normalize": "trim" });
var units = displayText(80);
var normalizedRecordKey2 = import_zod2.z.string().min(1).max(80).regex(
  /^\S(?:[\s\S]*\S)?$/,
  "record keys must already be trimmed and contain a non-whitespace character"
).regex(SAFE_DISPLAY_STRING_PATTERN, "record keys must not contain control or bidi characters");
function equalLengthIssue(ctx, path, expectedName, expected, actual) {
  if (actual !== expected) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: [path],
      message: `${path} length (${actual}) must match ${expectedName} length (${expected})`
    });
  }
}
function requireMonotonic(values, ctx, path) {
  for (let i = 1; i < values.length; i++) {
    if (values[i] < values[i - 1]) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: [path, i],
        message: `${path} must be monotonically non-decreasing`
      });
      return;
    }
  }
}
var VoltageTraceParamsSchema = import_zod2.z.object({
  times_ms: timeArray.min(1),
  series: import_zod2.z.array(gpuArray.min(1)).min(1).max(PARAM_LIMITS.maxSeries),
  series_labels: import_zod2.z.array(displayText(120)).min(1).max(PARAM_LIMITS.maxSeries),
  /** One shared unit for every series. Heterogeneous recorded variables must
   *  be authored as separate specs rather than sharing a misleading axis. */
  units
}).strict().superRefine((value, ctx) => {
  requireMonotonic(value.times_ms, ctx, "times_ms");
  value.series.forEach((series, index) => {
    equalLengthIssue(
      ctx,
      `series.${index}`,
      "times_ms",
      value.times_ms.length,
      series.length
    );
  });
  equalLengthIssue(
    ctx,
    "series_labels",
    "series",
    value.series.length,
    value.series_labels.length
  );
});
var SpikeRasterParamsSchema = import_zod2.z.object({
  times_ms: timeArray.min(1),
  senders: idArray.min(1)
}).strict().superRefine((value, ctx) => {
  equalLengthIssue(
    ctx,
    "senders",
    "times_ms",
    value.times_ms.length,
    value.senders.length
  );
});
var RateResponseParamsSchema = import_zod2.z.object({
  stimulus_amplitudes: gpuArray.min(1),
  rates_hz: gpuArray.min(1),
  stimulus_units: units
}).strict().superRefine((value, ctx) => {
  equalLengthIssue(
    ctx,
    "rates_hz",
    "stimulus_amplitudes",
    value.stimulus_amplitudes.length,
    value.rates_hz.length
  );
  for (let index = 0; index < value.rates_hz.length; index++) {
    const rate = value.rates_hz[index];
    if (rate < 0) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["rates_hz", index],
        message: "firing rates cannot be negative"
      });
      break;
    }
  }
});
var NetworkParamsSchema = import_zod2.z.object({
  sources: idArray.min(1),
  targets: idArray.min(1),
  weights: gpuArray.optional()
}).strict().superRefine((value, ctx) => {
  equalLengthIssue(
    ctx,
    "targets",
    "sources",
    value.sources.length,
    value.targets.length
  );
  if (value.weights) {
    equalLengthIssue(
      ctx,
      "weights",
      "sources",
      value.sources.length,
      value.weights.length
    );
  }
});
var Spatial3DObjectSchema = import_zod2.z.object({
  x: gpuNumber,
  y: gpuNumber,
  z: gpuNumber
}).passthrough();
var Spatial3DParamsSchema = import_zod2.z.object({
  objects: import_zod2.z.array(Spatial3DObjectSchema).min(1).max(PARAM_LIMITS.maxSpatialObjects),
  coordinate_units: units
}).strict();
var PlasticityParamsSchema = import_zod2.z.object({
  times_ms: timeArray.min(1),
  weights: gpuArray.min(1),
  weight_units: units
}).strict().superRefine((value, ctx) => {
  equalLengthIssue(
    ctx,
    "weights",
    "times_ms",
    value.times_ms.length,
    value.weights.length
  );
  requireMonotonic(value.times_ms, ctx, "times_ms");
});
var PhasePlaneParamsSchema = import_zod2.z.object({
  grid: import_zod2.z.record(normalizedRecordKey2, gpuArray.min(1)).refine((g) => Object.keys(g).length === 2, {
    message: "phase-plane grid must declare exactly two non-empty state-variable axes"
  }),
  derivatives: import_zod2.z.record(normalizedRecordKey2, gpuArray.min(1)),
  axis_units: import_zod2.z.record(normalizedRecordKey2, units),
  derivative_units: import_zod2.z.record(normalizedRecordKey2, units),
  axis_order: import_zod2.z.tuple([normalizedRecordKey2, normalizedRecordKey2]).refine(([first, second]) => first !== second, {
    message: "axis_order must name two distinct state variables"
  }),
  flattening: import_zod2.z.literal("row-major-last-axis-fastest")
}).strict().superRefine((value, ctx) => {
  const axes = Object.keys(value.grid);
  const derivativeNames = Object.keys(value.derivatives);
  if (value.axis_order.some((axis) => !Object.hasOwn(value.grid, axis)) || axes.some((axis) => !value.axis_order.includes(axis))) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["axis_order"],
      message: "axis_order must be a permutation of the two grid state variables"
    });
  }
  if (derivativeNames.length !== axes.length || axes.some((axis) => !Object.hasOwn(value.derivatives, axis))) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["derivatives"],
      message: "derivatives must declare the same two state variables as grid"
    });
    return;
  }
  for (const [field, values] of [
    ["axis_units", value.axis_units],
    ["derivative_units", value.derivative_units]
  ]) {
    const names = Object.keys(values);
    if (names.length !== axes.length || axes.some((axis) => !Object.hasOwn(values, axis))) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: [field],
        message: `${field} must declare units for the same two state variables as grid`
      });
    }
  }
  const expected = value.grid[axes[0]].length * value.grid[axes[1]].length;
  for (const axis of axes) {
    equalLengthIssue(
      ctx,
      `derivatives.${axis}`,
      "the Cartesian phase-plane grid",
      expected,
      value.derivatives[axis].length
    );
  }
});
var AstrocyteParamsSchema = import_zod2.z.object({
  times_ms: timeArray.min(1),
  ca_trace: gpuArray.min(1),
  units
}).strict().superRefine((value, ctx) => {
  equalLengthIssue(
    ctx,
    "ca_trace",
    "times_ms",
    value.times_ms.length,
    value.ca_trace.length
  );
  requireMonotonic(value.times_ms, ctx, "times_ms");
  for (let index = 0; index < value.ca_trace.length; index++) {
    if (value.ca_trace[index] < 0) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["ca_trace", index],
        message: "absolute Ca\xB2\u207A concentration cannot be negative"
      });
      break;
    }
  }
});
var KnowledgeGraphNodeSchema = import_zod2.z.object({
  id: displayText(120),
  kind: import_zod2.z.enum(["paper", "model", "family"]),
  label: displayText(240)
}).strict();
var KnowledgeGraphEdgeSchema = import_zod2.z.object({
  source: displayText(120),
  target: displayText(120),
  kind: import_zod2.z.enum([
    "cites",
    "same_as",
    "variant_of",
    "instantiates",
    "belongs_to_family"
  ])
}).strict();
var KnowledgeGraph3DParamsSchema = import_zod2.z.object({
  nodes: import_zod2.z.array(KnowledgeGraphNodeSchema).min(1).max(PARAM_LIMITS.maxGraphNodes),
  edges: import_zod2.z.array(KnowledgeGraphEdgeSchema).max(PARAM_LIMITS.maxGraphEdges)
}).strict().superRefine((value, ctx) => {
  const ids = /* @__PURE__ */ new Set();
  const nodeKinds = /* @__PURE__ */ new Map();
  const relationships = /* @__PURE__ */ new Set();
  let issueCount = 0;
  const addIssue = (issue) => {
    if (issueCount >= 16) return;
    issueCount += 1;
    ctx.addIssue(issue);
  };
  value.nodes.forEach((node, index) => {
    if (ids.has(node.id)) {
      addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["nodes", index, "id"],
        message: `duplicate node id '${node.id}'`
      });
    }
    ids.add(node.id);
    nodeKinds.set(node.id, node.kind);
  });
  value.edges.forEach((edge, index) => {
    const symmetric = edge.kind === "same_as";
    const source = symmetric && edge.source > edge.target ? edge.target : edge.source;
    const target = symmetric && edge.source > edge.target ? edge.source : edge.target;
    const relationship = JSON.stringify([source, target, edge.kind]);
    if (relationships.has(relationship)) {
      addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["edges", index],
        message: `duplicate ${edge.kind} edge '${edge.source}' \u2192 '${edge.target}'`
      });
    }
    relationships.add(relationship);
    if (!ids.has(edge.source)) {
      addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["edges", index, "source"],
        message: `edge source '${edge.source}' does not reference a node`
      });
    }
    if (!ids.has(edge.target)) {
      addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["edges", index, "target"],
        message: `edge target '${edge.target}' does not reference a node`
      });
    }
    if (edge.source === edge.target) {
      addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["edges", index],
        message: "self-loop edges are not renderable"
      });
    }
    const sourceKind = nodeKinds.get(edge.source);
    const targetKind = nodeKinds.get(edge.target);
    const expected = {
      cites: ["paper", "paper"],
      same_as: ["model", "model"],
      variant_of: ["model", "model"],
      instantiates: ["paper", "model"],
      belongs_to_family: ["model", "family"]
    };
    const [expectedSource, expectedTarget] = expected[edge.kind];
    if (sourceKind !== void 0 && targetKind !== void 0 && (sourceKind !== expectedSource || targetKind !== expectedTarget)) {
      addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["edges", index],
        message: `${edge.kind} requires ${expectedSource} \u2192 ${expectedTarget} endpoints`
      });
    }
  });
});
var Spatial2DParamsSchema = import_zod2.z.object({
  positions: import_zod2.z.array(import_zod2.z.tuple([gpuNumber, gpuNumber])).min(1).max(PARAM_LIMITS.maxSpatialObjects),
  coordinate_units: units
}).strict();
var correlogramUnits = {
  pearson_coefficient: "1",
  raw_pair_count: "count",
  count_per_bin: "count/bin",
  rate_hz: "Hz"
};
var CorrelogramParamsSchema = import_zod2.z.object({
  lags_ms: timeArray.min(1),
  correlation: gpuArray.min(1),
  normalization: import_zod2.z.enum([
    "pearson_coefficient",
    "raw_pair_count",
    "count_per_bin",
    "rate_hz"
  ]),
  correlation_units: import_zod2.z.enum(["1", "count", "count/bin", "Hz"])
}).strict().superRefine((value, ctx) => {
  equalLengthIssue(
    ctx,
    "correlation",
    "lags_ms",
    value.lags_ms.length,
    value.correlation.length
  );
  requireMonotonic(value.lags_ms, ctx, "lags_ms");
  if (value.correlation_units !== correlogramUnits[value.normalization]) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["correlation_units"],
      message: `correlation_units must be '${correlogramUnits[value.normalization]}' for ${value.normalization}`
    });
  }
  for (let index = 0; index < value.correlation.length; index++) {
    const sample = value.correlation[index];
    const invalid = value.normalization === "pearson_coefficient" ? sample < -1 || sample > 1 : value.normalization === "rate_hz" ? sample < 0 : sample < 0 || !Number.isSafeInteger(sample);
    if (invalid) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["correlation", index],
        message: value.normalization === "pearson_coefficient" ? "Pearson coefficients must lie in [-1, 1]" : value.normalization === "rate_hz" ? "correlation rates cannot be negative" : "pair counts must be non-negative safe integers"
      });
      break;
    }
  }
});
var StimulusResponseParamsSchema = import_zod2.z.object({
  times_ms: timeArray.min(1),
  stimulus: gpuArray.min(1),
  response: gpuArray.min(1)
}).strict().superRefine((value, ctx) => {
  equalLengthIssue(
    ctx,
    "stimulus",
    "times_ms",
    value.times_ms.length,
    value.stimulus.length
  );
  equalLengthIssue(
    ctx,
    "response",
    "times_ms",
    value.times_ms.length,
    value.response.length
  );
  requireMonotonic(value.times_ms, ctx, "times_ms");
});
var CompartmentalParamsSchema = import_zod2.z.object({
  times_ms: timeArray.min(1),
  compartments: import_zod2.z.array(
    import_zod2.z.object({
      id: displayText(120),
      parent_id: displayText(120).nullable(),
      label: displayText(240).optional(),
      values: gpuArray.min(1)
    }).strict()
  ).min(1).max(PARAM_LIMITS.maxSeries)
}).strict().superRefine((value, ctx) => {
  requireMonotonic(value.times_ms, ctx, "times_ms");
  const ids = /* @__PURE__ */ new Set();
  const parents = /* @__PURE__ */ new Map();
  let roots = 0;
  value.compartments.forEach((compartment, index) => {
    if (ids.has(compartment.id)) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["compartments", index, "id"],
        message: `duplicate compartment id '${compartment.id}'`
      });
    }
    ids.add(compartment.id);
    parents.set(compartment.id, compartment.parent_id);
    if (compartment.parent_id === null) roots += 1;
    equalLengthIssue(
      ctx,
      `compartments.${index}.values`,
      "times_ms",
      value.times_ms.length,
      compartment.values.length
    );
  });
  if (roots === 0) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      path: ["compartments"],
      message: "at least one root compartment must have parent_id:null"
    });
  }
  value.compartments.forEach((compartment, index) => {
    if (compartment.parent_id !== null && !ids.has(compartment.parent_id)) {
      ctx.addIssue({
        code: import_zod2.z.ZodIssueCode.custom,
        path: ["compartments", index, "parent_id"],
        message: `parent '${compartment.parent_id}' does not reference a compartment`
      });
    }
    const seen = /* @__PURE__ */ new Set();
    let cursor = compartment.id;
    while (cursor !== null && parents.has(cursor)) {
      if (seen.has(cursor)) {
        ctx.addIssue({
          code: import_zod2.z.ZodIssueCode.custom,
          path: ["compartments", index, "parent_id"],
          message: "compartment parent graph must be acyclic"
        });
        break;
      }
      seen.add(cursor);
      cursor = parents.get(cursor) ?? null;
    }
  });
});
var AnimationReplayParamsSchema = import_zod2.z.object({
  frames: import_zod2.z.array(
    import_zod2.z.object({
      time_ms: import_zod2.z.number().nonnegative(),
      state: import_zod2.z.record(normalizedRecordKey2, import_zod2.z.unknown()).refine((state) => Object.keys(state).length > 0, {
        message: "frame state must contain at least one field"
      }),
      annotation: displayText(500).optional()
    }).strict()
  ).min(1).max(1e4)
}).strict().superRefine((value, ctx) => {
  requireMonotonic(
    value.frames.map((frame) => frame.time_ms),
    ctx,
    "frames.time_ms"
  );
});

// core/skills/examples.ts
var synthetic = (declared_inputs) => ({
  source: "synthetic_test",
  calibrated_posterior: false,
  advisory_only: true,
  is_paper_local_evidence: false,
  synthetic: true,
  declared_inputs
});
var SKILL_EXAMPLE_PAYLOADS = {
  "nest.voltage_trace": {
    scene: "voltage-trace",
    params: {
      times_ms: [0, 1, 2],
      series: [[-65, -64, -63]],
      series_labels: ["neuron 1 \xB7 V_m"],
      units: "mV"
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      device_id: "mm_1",
      recorded_variable: "V_m",
      units: "mV",
      sampling_interval: 0.1
    })
  },
  "nest.spike_raster": {
    scene: "spike-raster",
    params: { times_ms: [1, 2, 3], senders: [1, 2, 1] },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      recorder_id: "sr_1",
      sender_ids: "[1,2]",
      population_labels: "E",
      time_units: "ms"
    })
  },
  "nest.rate_response": {
    scene: "fi-curve",
    params: {
      stimulus_amplitudes: [0, 100, 200],
      rates_hz: [0, 12, 31],
      stimulus_units: "pA"
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({ stim_units: "pA", bin_ms: 100, rate_normalization: "spikes/s" })
  },
  "nest.connectivity_matrix": {
    scene: "network-topology",
    params: { sources: [1, 2], targets: [2, 3], weights: [1, 0.5] },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      source_ids: "[1,2]",
      target_ids: "[2,3]",
      synapse_model: "static_synapse",
      weight_units: "pA"
    })
  },
  "nest.spatial_3d": {
    scene: "network-topology",
    params: {
      objects: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }],
      coordinate_units: "mm"
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      extent: "[1,1,1]",
      spatial_units: "mm",
      projection_sample_policy: "all"
    })
  },
  "nest.plasticity_dynamics": {
    scene: "stdp",
    params: { times_ms: [0, 10, 20], weights: [1, 1.1, 1.05], weight_units: "nS" },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({ synapse_model: "stdp_synapse", weight_units: "nS" })
  },
  "nest.phase_plane": {
    scene: "phase-plane",
    params: {
      grid: { v: [-70, -50], w: [0, 1] },
      derivatives: {
        v: [0.2, 0.1, -0.1, -0.2],
        w: [-0.05, 0.05, -0.05, 0.05]
      },
      axis_units: { v: "mV", w: "1" },
      derivative_units: { v: "mV/ms", w: "1/ms" },
      axis_order: ["v", "w"],
      flattening: "row-major-last-axis-fastest"
    },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      state_variables: "V,w",
      derivation_method: "model equations evaluated on Cartesian grid",
      model_context: "Hodgkin-Huxley reduced phase plane",
      fixed_parameters: "all non-plotted state variables clamped to declared values"
    })
  },
  "nest.astrocyte_dynamics": {
    scene: "voltage-trace",
    params: { times_ms: [0, 1, 2], ca_trace: [0.1, 0.2, 0.15], units: "uM" },
    mode: "interactive",
    themeMode: "dark",
    provenance: synthetic({
      recorded_variable: "Ca",
      units: "uM",
      time_units: "ms",
      sampling_interval: 1
    })
  },
  "corpus.knowledge_graph": {
    scene: "knowledge-graph-3d",
    params: {
      nodes: [
        { id: "p1", kind: "paper", label: "Brunel 2000" },
        { id: "m1", kind: "model", label: "iaf_psc_delta" },
        { id: "f1", kind: "family", label: "LIF family" }
      ],
      edges: [
        { source: "p1", target: "m1", kind: "instantiates" },
        { source: "m1", target: "f1", kind: "belongs_to_family" }
      ]
    },
    mode: "interactive",
    themeMode: "dark",
    // advisory_only:true — identity edges are advisory structural similarity.
    provenance: {
      ...synthetic({
        graph_source: "corpus_kg",
        node_kinds: "paper,model,family",
        edge_kinds: "instantiates,belongs_to_family",
        identity_advisory: true
      }),
      advisory_only: true
    }
  }
};
var HOST_RENDERER_EXAMPLE_PAYLOADS = {
  "nest.spatial_2d": {
    skill: "nest.spatial_2d",
    specVersion: CORTEXEL_SPEC_VERSION,
    rendererRoute: "d3",
    params: { positions: [[0, 0], [1, 1]], coordinate_units: "mm" },
    provenance: synthetic({
      extent: "[1,1]",
      spatial_units: "mm",
      mask: "none",
      kernel: "none"
    })
  },
  "nest.correlogram": {
    skill: "nest.correlogram",
    specVersion: CORTEXEL_SPEC_VERSION,
    rendererRoute: "d3",
    params: {
      lags_ms: [-2, -1, 0, 1, 2],
      correlation: [0.1, 0.4, 1, 0.4, 0.1],
      normalization: "pearson_coefficient",
      correlation_units: "1"
    },
    provenance: synthetic({
      bin_ms: 1,
      pair_labels: "E\xD7E",
      correlation_normalization: "pearson_coefficient",
      correlation_units: "1"
    })
  },
  "nest.stimulus_response": {
    skill: "nest.stimulus_response",
    specVersion: CORTEXEL_SPEC_VERSION,
    rendererRoute: "matplotlib",
    params: {
      times_ms: [0, 1, 2],
      stimulus: [0, 1, 0],
      response: [-65, -60, -64]
    },
    provenance: synthetic({ stim_units: "pA", units: "mV", time_units: "ms" })
  },
  "nest.compartmental_dynamics": {
    skill: "nest.compartmental_dynamics",
    specVersion: CORTEXEL_SPEC_VERSION,
    rendererRoute: "d3",
    params: {
      times_ms: [0, 1, 2],
      compartments: [
        {
          id: "soma",
          parent_id: null,
          label: "soma",
          values: [-65, -64, -63]
        }
      ]
    },
    provenance: synthetic({
      morphology_disclaimer: "schematic topology; no inferred geometry",
      recorded_variable: "V_m",
      units: "mV",
      time_units: "ms",
      sampling_interval: 1
    })
  },
  "nest.animation_replay": {
    skill: "nest.animation_replay",
    specVersion: CORTEXEL_SPEC_VERSION,
    rendererRoute: "manim",
    params: { frames: [{ time_ms: 0, state: { status: "initial" } }] },
    provenance: synthetic({ frame_rate: 30 })
  }
};
function deepFreezeJson(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return;
  for (const child of Object.values(value)) deepFreezeJson(child);
  Object.freeze(value);
}
for (const [skill, payload] of Object.entries(SKILL_EXAMPLE_PAYLOADS)) {
  if (!payload) continue;
  payload.skill = skill;
  payload.specVersion = CORTEXEL_SPEC_VERSION;
  deepFreezeJson(payload);
}
Object.setPrototypeOf(SKILL_EXAMPLE_PAYLOADS, null);
Object.freeze(SKILL_EXAMPLE_PAYLOADS);
for (const payload of Object.values(HOST_RENDERER_EXAMPLE_PAYLOADS)) {
  if (payload) deepFreezeJson(payload);
}
Object.setPrototypeOf(HOST_RENDERER_EXAMPLE_PAYLOADS, null);
Object.freeze(HOST_RENDERER_EXAMPLE_PAYLOADS);
function getExamplePayload(id2) {
  if (!isSkillId(id2)) return void 0;
  const payload = SKILL_EXAMPLE_PAYLOADS[id2];
  return payload ? JSON.parse(JSON.stringify(payload)) : void 0;
}
function getHostRendererExamplePayload(id2) {
  if (!isSkillId(id2)) return void 0;
  const payload = HOST_RENDERER_EXAMPLE_PAYLOADS[id2];
  return payload ? JSON.parse(JSON.stringify(payload)) : void 0;
}
function getInvocationExamplePayload(id2) {
  return getExamplePayload(id2) ?? getHostRendererExamplePayload(id2);
}

// core/skills/registry.ts
var STRICT_INVOCATION_POLICY = Object.freeze({
  version: "1",
  externalSelection: "validateSkillInvocation(id,payload): explicit id selects; payload.skill is optional but must match when present",
  selfDescribingSelection: "validateSpec(payload): payload.skill is required and selects the contract",
  hostSelection: "host envelopes require payload.skill; explicit id and payload.skill must match",
  unknownSkillIds: "reject",
  cortexelEnvelope: "allowed iff contract.scene is non-null; payload.scene must equal contract.scene",
  hostEnvelope: "allowed iff contract.scene is null; scene is forbidden",
  rendererRoute: "when selected, must occur in contract.rendererRoutes",
  params: "validate paramsJsonSchema then every paramConstraint",
  provenance: "apply strictProvenancePolicy and every provenanceParamConstraint"
});
var PARAM_CONSTRAINT_LANGUAGE = Object.freeze({
  version: "2",
  pathSyntax: "dot-separated object keys",
  arrayWildcard: "[*]",
  objectValueWildcard: "*",
  optionalSuffix: "?",
  evaluationOrder: Object.freeze([
    "normalize fields carrying x-cortexel-normalize",
    "validate paramsJsonSchema",
    "evaluate paramConstraints in listed order"
  ]),
  kinds: Object.freeze([
    "equal_length",
    "each_length_matches",
    "monotonic_non_decreasing",
    "non_negative",
    "property_count",
    "unique_field",
    "unique_tuple",
    "references_exist",
    "no_self_loops",
    "same_keys",
    "cartesian_product_length",
    "permutation_of_keys",
    "endpoint_kinds",
    "mapped_value",
    "conditional_numeric_domain",
    "acyclic"
  ]),
  semantics: Object.freeze({
    equal_length: Object.freeze({
      pathRoles: "all paths resolve to arrays",
      rule: "all present arrays have identical length",
      optionalAbsent: "skip a path ending in ?"
    }),
    each_length_matches: Object.freeze({
      pathRoles: "first path resolves zero or more arrays; last path is the reference array",
      rule: "every first-path array length equals the reference-array length"
    }),
    monotonic_non_decreasing: Object.freeze({
      pathRoles: "each path resolves an ordered numeric sequence",
      rule: "for every adjacent pair previous <= next"
    }),
    non_negative: Object.freeze({
      pathRoles: "each path resolves numeric values",
      rule: "every resolved number is >= 0"
    }),
    property_count: Object.freeze({
      pathRoles: "each path resolves objects",
      rule: "own enumerable property count is within optional min/max inclusive"
    }),
    unique_field: Object.freeze({
      pathRoles: "the first path resolves an array of objects; field names the key",
      rule: "field values are unique under JSON scalar equality"
    }),
    unique_tuple: Object.freeze({
      pathRoles: "paths resolve equal-length scalar sequences zipped by index",
      rule: "zipped JSON tuples are unique; when the final kind value is in symmetricKinds, canonicalize the first two tuple values lexicographically"
    }),
    references_exist: Object.freeze({
      pathRoles: "all paths except the last resolve references; the last resolves the allowed-id set",
      rule: "every non-null reference occurs in the allowed-id set"
    }),
    no_self_loops: Object.freeze({
      pathRoles: "first and second paths resolve equal-length source and target sequences",
      rule: "source[index] !== target[index] for every index"
    }),
    same_keys: Object.freeze({
      pathRoles: "paths resolve objects",
      rule: "all objects have exactly the same own enumerable string-key set"
    }),
    cartesian_product_length: Object.freeze({
      pathRoles: "first path resolves axis arrays; second path resolves output arrays",
      rule: "every output-array length equals the product of all axis-array lengths"
    }),
    permutation_of_keys: Object.freeze({
      pathRoles: "first path resolves a scalar sequence; second path resolves an object",
      rule: "the sequence contains every object key exactly once"
    }),
    endpoint_kinds: Object.freeze({
      pathRoles: "first path resolves edges with source/target/kind; second resolves nodes with id/kind",
      rule: "each edge endpoint node kind equals allowedEndpointKinds[edge.kind]"
    }),
    mapped_value: Object.freeze({
      pathRoles: "first path resolves a discriminator scalar; second path resolves its dependent scalar",
      rule: "the second value equals allowedValues[first value]"
    }),
    conditional_numeric_domain: Object.freeze({
      pathRoles: "first path resolves a discriminator scalar; second path resolves numeric values",
      rule: "every numeric value satisfies numericDomains[discriminator] inclusive min/max and optional integer requirement"
    }),
    acyclic: Object.freeze({
      pathRoles: "first path resolves node ids; second resolves each node parent id or null",
      rule: "following parent links from any id never revisits an id"
    })
  })
});
var NEST_SKILL_REGISTRY = {
  "nest.voltage_trace": {
    id: "nest.voltage_trace",
    version: "1.2.0",
    title: "NEST voltage trace renderer",
    description: "Render labeled multimeter/voltmeter series for one recorded variable and unit.",
    deviceFamily: "multimeter",
    scene: "voltage-trace",
    requiredInputKeys: ["times_ms", "series", "series_labels", "units"],
    paramsSchema: VoltageTraceParamsSchema,
    requiredProvenanceKeys: [
      "device_id",
      "recorded_variable",
      "units",
      "sampling_interval"
    ],
    provenanceParamConstraints: [
      {
        kind: "equals_param",
        provenanceKey: "units",
        paramKey: "units",
        description: "Declared units must match the rendered trace-axis units."
      }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [
      {
        nestExample: "One neuron example / multimeter recording",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/one_neuron.html",
        dataShape: "times_ms + same-unit series split and labeled by sender",
        output: "Selectable trace, spike markers, JSON + SVG export",
        note: "Use one invocation per variable/unit; never mix mV, pA and nS on one axis."
      }
    ]
  },
  "nest.spike_raster": {
    id: "nest.spike_raster",
    version: "1.2.0",
    title: "NEST spike raster renderer",
    description: "Render spike_recorder events as rasters, spike trains and population plots.",
    deviceFamily: "spike_recorder",
    scene: "spike-raster",
    requiredInputKeys: ["times_ms", "senders"],
    paramsSchema: SpikeRasterParamsSchema,
    requiredProvenanceKeys: [
      "recorder_id",
      "sender_ids",
      "population_labels",
      "time_units"
    ],
    provenanceParamConstraints: [
      {
        kind: "equals_literal",
        provenanceKey: "time_units",
        value: "ms",
        description: "The times_ms axis is expressed in milliseconds."
      }
    ],
    rendererRoutes: ["media.model_graph", "d3"],
    examples: [
      {
        nestExample: "Random balanced Brunel network",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/brunel_alpha_nest.html",
        dataShape: "spike_recorder events: times_ms, senders, population labels",
        output: "Sender-time raster, population rate strip, selectable windows",
        note: "Use exact spike times first; aggregate only when too dense to read."
      }
    ]
  },
  "nest.rate_response": {
    id: "nest.rate_response",
    version: "1.2.0",
    title: "NEST rate / IF response renderer",
    description: "Render firing-rate / IF curves and population rates derived from spike counts.",
    deviceFamily: "spike_recorder",
    scene: "fi-curve",
    requiredInputKeys: ["stimulus_amplitudes", "rates_hz", "stimulus_units"],
    paramsSchema: RateResponseParamsSchema,
    requiredProvenanceKeys: ["stim_units", "bin_ms", "rate_normalization"],
    provenanceParamConstraints: [
      {
        kind: "equals_param",
        provenanceKey: "stim_units",
        paramKey: "stimulus_units",
        description: "Declared stimulus units must match params.stimulus_units."
      }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib", "d3"],
    examples: [
      {
        nestExample: "IF curve example",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/if_curve.html",
        dataShape: "stimulus amplitudes, rates_hz, spike counts",
        output: "IF curve, population-rate trace, decision crossing markers",
        note: "Always show bin width / counting window so rates stay auditable."
      }
    ]
  },
  "nest.connectivity_matrix": {
    id: "nest.connectivity_matrix",
    version: "1.2.0",
    title: "NEST connectivity matrix renderer",
    description: "Render SynapseCollection connectivity, weights and population blocks.",
    deviceFamily: "get_connections",
    scene: "network-topology",
    // Connectivity evidence contains endpoints/weights, not measured spatial
    // coordinates. Any node placement in the topology scene is schematic.
    weak: true,
    weakDisclosure: "Schematic topology layout \u2014 node positions and distances are derived for readability; only the declared edges and weights are evidence.",
    requiredInputKeys: ["sources", "targets"],
    paramsSchema: NetworkParamsSchema,
    requiredProvenanceKeys: [
      "source_ids",
      "target_ids",
      "synapse_model",
      "weight_units"
    ],
    rendererRoutes: ["media.model_graph", "d3"],
    examples: [
      {
        nestExample: "Plot weight matrices example / SynapseCollection",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/plot_weight_matrices.html",
        dataShape: "sources, targets, weights, delays, source/target populations",
        output: "Topology node-edge view, selected block stats, weight histogram",
        note: "Keep absent connections distinct from zero-weight connections; topology positions/distances are schematic."
      }
    ]
  },
  "nest.spatial_2d": {
    id: "nest.spatial_2d",
    version: "1.2.0",
    title: "NEST 2D spatial renderer",
    description: "Render 2D layer positions, masks, kernels and sampled projections.",
    deviceFamily: "get_position",
    scene: null,
    // no honest 2D-spatial scene yet (would violate sphere/voxel law)
    requiredInputKeys: ["positions", "coordinate_units"],
    paramsSchema: Spatial2DParamsSchema,
    requiredProvenanceKeys: ["extent", "spatial_units", "mask", "kernel"],
    provenanceParamConstraints: [
      {
        kind: "equals_param",
        provenanceKey: "spatial_units",
        paramKey: "coordinate_units",
        description: "Declared spatial units must match the coordinate axis units."
      }
    ],
    rendererRoutes: ["media.model_graph", "d3"],
    examples: [
      {
        nestExample: "Circular mask, Gaussian kernel, grid/free spatial examples",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/spatial/connex.html",
        dataShape: "node x/y positions, masks, kernels, sampled edges",
        output: "No Cortexel scene yet \u2014 route to a 2D d3 map on the host.",
        note: "scene:null \u2014 render via host d3, not a Cortexel 3D scene."
      }
    ]
  },
  "nest.spatial_3d": {
    id: "nest.spatial_3d",
    version: "1.2.0",
    title: "NEST 3D spatial renderer",
    description: "Render 3D population/node positions for spatial inspection.",
    deviceFamily: "get_position",
    scene: "network-topology",
    requiredInputKeys: ["objects", "coordinate_units"],
    paramsSchema: Spatial3DParamsSchema,
    requiredProvenanceKeys: ["extent", "spatial_units", "projection_sample_policy"],
    provenanceParamConstraints: [
      {
        kind: "equals_param",
        provenanceKey: "spatial_units",
        paramKey: "coordinate_units",
        description: "Declared spatial units must match the coordinate axis units."
      }
    ],
    rendererRoutes: [
      "media.webgl_scene",
      "media.react_fiber_scene",
      "three",
      "fiber"
    ],
    examples: [
      {
        nestExample: "3D spatial network with exponential/Gaussian probabilities",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/spatial/test_3d.html",
        dataShape: "node x/y/z positions, extent, sampled edges",
        output: "Selectable 3D scene plus SVG projection fallback",
        note: "Use 3D as inspection aid; do not imply biological geometry."
      }
    ]
  },
  "nest.plasticity_dynamics": {
    id: "nest.plasticity_dynamics",
    version: "1.2.0",
    title: "NEST plasticity dynamics renderer",
    description: "Render STDP windows, weight adaptation and short-term dynamics.",
    deviceFamily: "weight_recorder",
    scene: "stdp",
    requiredInputKeys: ["times_ms", "weights", "weight_units"],
    paramsSchema: PlasticityParamsSchema,
    requiredProvenanceKeys: ["synapse_model", "weight_units"],
    provenanceParamConstraints: [
      {
        kind: "equals_param",
        provenanceKey: "weight_units",
        paramKey: "weight_units",
        description: "Declared weight units must match the rendered weight axis."
      }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib"],
    examples: [
      {
        nestExample: "Urbanczik-Senn / Clopath / Tsodyks short-term plasticity",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/urbanczik_synapse_example.html",
        dataShape: "weights, u/x resources, pre/post spikes, delta_t, delta_weight",
        output: "Weight trace, STDP window, spike protocol rugs",
        note: "Preserve pre/post sign convention; label all plasticity parameters."
      }
    ]
  },
  "nest.phase_plane": {
    id: "nest.phase_plane",
    version: "1.2.0",
    title: "NEST phase-plane renderer",
    description: "Render phase planes, vector fields, nullclines and trajectories.",
    deviceFamily: "computed",
    scene: "phase-plane",
    requiredInputKeys: [
      "grid",
      "derivatives",
      "axis_units",
      "derivative_units",
      "axis_order",
      "flattening"
    ],
    paramsSchema: PhasePlaneParamsSchema,
    requiredProvenanceKeys: [
      "state_variables",
      "derivation_method",
      "model_context",
      "fixed_parameters"
    ],
    rendererRoutes: ["media.model_graph", "d3"],
    examples: [
      {
        nestExample: "Numerical phase-plane analysis of the Hodgkin-Huxley neuron",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/hh_phaseplane.html",
        dataShape: "state variable grid, derivatives, nullcline points, trajectory",
        output: "Vector field, nullclines, trajectory, equilibrium annotations",
        note: "Distinguish clamped state variables from simulated dynamic ones."
      }
    ]
  },
  "nest.correlogram": {
    id: "nest.correlogram",
    version: "1.2.0",
    title: "NEST correlogram / synchrony renderer",
    description: "Render auto/cross-correlation functions for spike trains.",
    deviceFamily: "spike_recorder",
    scene: null,
    // ISI-histogram scene exists but the math differs — no honest reuse
    requiredInputKeys: [
      "lags_ms",
      "correlation",
      "normalization",
      "correlation_units"
    ],
    paramsSchema: CorrelogramParamsSchema,
    requiredProvenanceKeys: [
      "bin_ms",
      "pair_labels",
      "correlation_normalization",
      "correlation_units"
    ],
    provenanceParamConstraints: [
      {
        kind: "equals_param",
        provenanceKey: "correlation_normalization",
        paramKey: "normalization",
        description: "Declared normalization must match the correlogram value semantics."
      },
      {
        kind: "equals_param",
        provenanceKey: "correlation_units",
        paramKey: "correlation_units",
        description: "Declared value units must match the correlogram y axis."
      }
    ],
    rendererRoutes: ["media.model_graph", "d3"],
    examples: [
      {
        nestExample: "Auto- and crosscorrelation functions for spike trains",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/cross_check_mip_corrdet.html",
        dataShape: "lags_ms, correlation values, pair labels, bin width",
        output: "No Cortexel scene (distinct from ISI) \u2014 route to host d3.",
        note: "scene:null \u2014 correlogram math differs from the ISI histogram scene."
      }
    ]
  },
  "nest.stimulus_response": {
    id: "nest.stimulus_response",
    version: "1.2.0",
    title: "NEST stimulus-response protocol renderer",
    description: "Render aligned stimulus waveforms, responses, spikes and protocol epochs.",
    deviceFamily: "multimeter",
    scene: null,
    // composite multi-panel protocol; no single Cortexel scene
    requiredInputKeys: ["times_ms", "stimulus", "response"],
    paramsSchema: StimulusResponseParamsSchema,
    requiredProvenanceKeys: ["stim_units", "units", "time_units"],
    provenanceParamConstraints: [
      {
        kind: "equals_literal",
        provenanceKey: "time_units",
        value: "ms",
        description: "The times_ms axis is expressed in milliseconds."
      }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib"],
    examples: [
      {
        nestExample: "Sinusoidal generator / pulse packet / repeated stimulation",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/pulsepacket.html",
        dataShape: "stimulus waveform, analog response, spike events, epochs",
        output: "Composite protocol panels \u2014 host-composed, no single scene.",
        note: "scene:null \u2014 multi-panel protocol composed by the host."
      }
    ]
  },
  "nest.astrocyte_dynamics": {
    id: "nest.astrocyte_dynamics",
    version: "1.2.0",
    title: "NEST astrocyte Ca\xB2\u207A/IP\u2083 dynamics renderer",
    description: "Render tripartite-synapse calcium/IP3 state-variable traces.",
    deviceFamily: "multimeter",
    scene: "voltage-trace",
    weak: true,
    // analog-trace reuse: Ca/IP3 are not membrane voltage
    weakDisclosure: "Derived view \u2014 Ca\xB2\u207A/IP\u2083 shown through the analog-trace scene; these are glial signals, not membrane voltage.",
    requiredInputKeys: ["times_ms", "ca_trace", "units"],
    paramsSchema: AstrocyteParamsSchema,
    requiredProvenanceKeys: [
      "recorded_variable",
      "units",
      "time_units",
      "sampling_interval"
    ],
    provenanceParamConstraints: [
      {
        kind: "equals_param",
        provenanceKey: "units",
        paramKey: "units",
        description: "Declared units must match the rendered glial trace units."
      },
      {
        kind: "equals_literal",
        provenanceKey: "time_units",
        value: "ms",
        description: "The times_ms axis is expressed in milliseconds."
      }
    ],
    rendererRoutes: ["media.trace_figure", "matplotlib"],
    examples: [
      {
        nestExample: "Single astrocyte / tripartite interaction examples",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/astrocytes/astrocyte_single.html",
        dataShape: "Ca/IP3/state variables, linked neuron events",
        output: "Calcium/IP3 traces via the analog-trace scene (flagged derived)",
        note: "weak:true \u2014 keep glial and neuronal units explicitly separate."
      }
    ]
  },
  "nest.compartmental_dynamics": {
    id: "nest.compartmental_dynamics",
    version: "1.2.0",
    title: "NEST compartmental morphology + dynamics renderer",
    description: "Render multi-compartment morphologies, receptor ports and soma/dendrite traces.",
    deviceFamily: "multimeter",
    scene: null,
    // morphology geometry has no honest Cortexel scene (no invented geometry)
    requiredInputKeys: ["times_ms", "compartments"],
    paramsSchema: CompartmentalParamsSchema,
    requiredProvenanceKeys: [
      "morphology_disclaimer",
      "recorded_variable",
      "units",
      "time_units",
      "sampling_interval"
    ],
    provenanceParamConstraints: [
      {
        kind: "equals_literal",
        provenanceKey: "time_units",
        value: "ms",
        description: "The times_ms axis is expressed in milliseconds."
      }
    ],
    rendererRoutes: ["media.model_graph", "d3"],
    examples: [
      {
        nestExample: "Receptors/current and two-compartment neuron examples",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/compartmental_model/receptors_and_current.html",
        dataShape: "compartments, receptor ports, soma/dendrite traces",
        output: "No Cortexel scene \u2014 host d3 morphology tree with linked traces.",
        note: "scene:null \u2014 do not invent morphology geometry from labels."
      }
    ]
  },
  "nest.animation_replay": {
    id: "nest.animation_replay",
    version: "1.2.0",
    title: "NEST state replay / animation storyboard renderer",
    description: "Render time-evolution storyboards and inspectable state replays.",
    deviceFamily: "computed",
    scene: null,
    // offline manim storyboard, not a live r3f scene — do not mis-route
    requiredInputKeys: ["frames"],
    paramsSchema: AnimationReplayParamsSchema,
    requiredProvenanceKeys: ["frame_rate"],
    rendererRoutes: ["media.manim_storyboard", "manim"],
    examples: [
      {
        nestExample: "Sudoku progress GIF / Pong replay",
        sourceUrl: "https://nest-simulator.readthedocs.io/en/latest/auto_examples/sudoku/plot_progress.html",
        dataShape: "frames, entities, metrics, frame rate, annotations",
        output: "Manim storyboard / source \u2014 no live Cortexel scene.",
        note: "scene:null \u2014 offline storyboard, not a real-time render target."
      }
    ]
  },
  "corpus.knowledge_graph": {
    id: "corpus.knowledge_graph",
    version: "1.2.0",
    title: "Corpus knowledge-graph 3D renderer",
    description: "Render a cross-paper corpus knowledge graph in 3D: paper/model/family nodes with citation, instantiation and family edges, plus advisory model-identity (same_as/variant_of) edges.",
    deviceFamily: "corpus",
    scene: "knowledge-graph-3d",
    // weak: identity edges are advisory structural similarity, NOT certified
    // sameness, and force-layout geometry is algorithmic rather than evidence.
    // This is NOT scene reuse — knowledge-graph-3d is the native scene — so the
    // disclosure is about DATA semantics, not fidelity of the renderer.
    weak: true,
    weakDisclosure: "Advisory graph \u2014 same_as/variant_of edges are structural similarity, not certified sameness; force-layout positions and distances are schematic, not quantitative evidence.",
    requiredInputKeys: ["nodes", "edges"],
    paramsSchema: KnowledgeGraph3DParamsSchema,
    requiredProvenanceKeys: [
      "graph_source",
      "node_kinds",
      "edge_kinds",
      "identity_advisory"
    ],
    rendererRoutes: ["media.model_graph", "fiber"],
    examples: [
      {
        nestExample: "Cross-paper corpus knowledge graph (papers + models + families)",
        sourceUrl: "https://github.com/sepahead/Paper2Brain#knowledge-graph",
        dataShape: "nodes (paper/model/family), edges (cites/same_as/variant_of/instantiates/belongs_to_family)",
        output: "3D force-directed graph with citation-flow particles and focus labels",
        note: "weak:true \u2014 model-identity edges are advisory and force-layout geometry is non-evidentiary."
      }
    ]
  }
};
var PARAM_VALIDATION_CONSTRAINTS = {
  "nest.voltage_trace": [
    {
      kind: "equal_length",
      paths: ["series", "series_labels"],
      description: "Every trace series must have one non-empty label."
    },
    {
      kind: "each_length_matches",
      paths: ["series[*]", "times_ms"],
      description: "Every trace series must contain one value per times_ms sample."
    },
    {
      kind: "monotonic_non_decreasing",
      paths: ["times_ms"],
      description: "Trace timestamps must be monotonically non-decreasing."
    }
  ],
  "nest.spike_raster": [
    {
      kind: "equal_length",
      paths: ["times_ms", "senders"],
      description: "Every spike timestamp must have one sender id."
    }
  ],
  "nest.rate_response": [
    {
      kind: "equal_length",
      paths: ["stimulus_amplitudes", "rates_hz"],
      description: "Every stimulus amplitude must have one firing-rate value."
    },
    {
      kind: "non_negative",
      paths: ["rates_hz[*]"],
      description: "Firing rates cannot be negative."
    }
  ],
  "nest.connectivity_matrix": [
    {
      kind: "equal_length",
      paths: ["sources", "targets", "weights?"],
      description: "Connection endpoints and optional weights are parallel arrays."
    }
  ],
  "nest.plasticity_dynamics": [
    {
      kind: "equal_length",
      paths: ["times_ms", "weights"],
      description: "Every plasticity timestamp must have one weight value."
    },
    {
      kind: "monotonic_non_decreasing",
      paths: ["times_ms"],
      description: "Plasticity timestamps must be monotonically non-decreasing."
    }
  ],
  "nest.phase_plane": [
    {
      kind: "property_count",
      paths: ["grid"],
      min: 2,
      max: 2,
      description: "A phase plane has exactly two state-variable axes."
    },
    {
      kind: "same_keys",
      paths: ["grid", "derivatives"],
      description: "Derivative fields must use the same state-variable names as the grid."
    },
    {
      kind: "same_keys",
      paths: ["grid", "axis_units"],
      description: "Every phase-plane axis must declare its coordinate units."
    },
    {
      kind: "same_keys",
      paths: ["grid", "derivative_units"],
      description: "Every phase-plane derivative field must declare its units."
    },
    {
      kind: "cartesian_product_length",
      paths: ["grid.*", "derivatives.*"],
      description: "Each derivative field has one value per Cartesian grid point."
    },
    {
      kind: "permutation_of_keys",
      paths: ["axis_order", "grid"],
      description: "axis_order must contain every grid key exactly once, in flattening order."
    }
  ],
  "nest.correlogram": [
    {
      kind: "equal_length",
      paths: ["lags_ms", "correlation"],
      description: "Every lag must have one correlation value."
    },
    {
      kind: "monotonic_non_decreasing",
      paths: ["lags_ms"],
      description: "Correlogram lags must be monotonically non-decreasing."
    },
    {
      kind: "mapped_value",
      paths: ["normalization", "correlation_units"],
      allowedValues: {
        pearson_coefficient: "1",
        raw_pair_count: "count",
        count_per_bin: "count/bin",
        rate_hz: "Hz"
      },
      description: "Each correlogram normalization has one unambiguous y-axis unit."
    },
    {
      kind: "conditional_numeric_domain",
      paths: ["normalization", "correlation[*]"],
      numericDomains: {
        pearson_coefficient: { min: -1, max: 1 },
        raw_pair_count: { min: 0, max: Number.MAX_SAFE_INTEGER, integer: true },
        count_per_bin: { min: 0, max: Number.MAX_SAFE_INTEGER, integer: true },
        rate_hz: { min: 0 }
      },
      description: "Correlogram values must obey the numeric domain implied by their normalization."
    }
  ],
  "nest.stimulus_response": [
    {
      kind: "equal_length",
      paths: ["times_ms", "stimulus", "response"],
      description: "Time, stimulus, and response samples must align one-to-one."
    },
    {
      kind: "monotonic_non_decreasing",
      paths: ["times_ms"],
      description: "Stimulus-response timestamps must be monotonically non-decreasing."
    }
  ],
  "nest.astrocyte_dynamics": [
    {
      kind: "equal_length",
      paths: ["times_ms", "ca_trace"],
      description: "Every glial sample must have one timestamp."
    },
    {
      kind: "monotonic_non_decreasing",
      paths: ["times_ms"],
      description: "Glial timestamps must be monotonically non-decreasing."
    },
    {
      kind: "non_negative",
      paths: ["ca_trace[*]"],
      description: "The declared Ca\xB2\u207A concentration trace cannot be negative."
    }
  ],
  "nest.compartmental_dynamics": [
    {
      kind: "each_length_matches",
      paths: ["compartments[*].values", "times_ms"],
      description: "Every compartment trace has one value per timestamp."
    },
    {
      kind: "unique_field",
      paths: ["compartments"],
      field: "id",
      description: "Compartment ids must be unique."
    },
    {
      kind: "references_exist",
      paths: ["compartments[*].parent_id", "compartments[*].id"],
      description: "Every non-null parent id must reference a declared compartment."
    },
    {
      kind: "acyclic",
      paths: ["compartments[*].id", "compartments[*].parent_id"],
      description: "The compartment parent graph must be acyclic."
    },
    {
      kind: "monotonic_non_decreasing",
      paths: ["times_ms"],
      description: "Compartment timestamps must be monotonically non-decreasing."
    }
  ],
  "nest.animation_replay": [
    {
      kind: "monotonic_non_decreasing",
      paths: ["frames[*].time_ms"],
      description: "Replay frame timestamps must be monotonically non-decreasing."
    },
    {
      kind: "property_count",
      paths: ["frames[*].state"],
      min: 1,
      description: "Every replay frame state must contain at least one field."
    }
  ],
  "corpus.knowledge_graph": [
    {
      kind: "unique_field",
      paths: ["nodes"],
      field: "id",
      description: "Node ids must be unique."
    },
    {
      kind: "unique_tuple",
      paths: ["edges[*].source", "edges[*].target", "edges[*].kind"],
      symmetricKinds: ["same_as"],
      description: "Duplicate source/target/kind relationships are not allowed."
    },
    {
      kind: "references_exist",
      paths: ["edges[*].source", "edges[*].target", "nodes[*].id"],
      description: "Every edge endpoint must reference a declared node id."
    },
    {
      kind: "no_self_loops",
      paths: ["edges[*].source", "edges[*].target"],
      description: "Self-loop edges are not renderable by this scene."
    },
    {
      kind: "endpoint_kinds",
      paths: ["edges", "nodes"],
      allowedEndpointKinds: {
        cites: ["paper", "paper"],
        same_as: ["model", "model"],
        variant_of: ["model", "model"],
        instantiates: ["paper", "model"],
        belongs_to_family: ["model", "family"]
      },
      description: "Each semantic edge kind has a fixed source-kind and target-kind contract."
    }
  ]
};
Object.setPrototypeOf(PARAM_VALIDATION_CONSTRAINTS, null);
for (const constraints of Object.values(PARAM_VALIDATION_CONSTRAINTS)) {
  constraints?.forEach((constraint) => {
    Object.freeze(constraint.paths);
    if (constraint.symmetricKinds) Object.freeze(constraint.symmetricKinds);
    if (constraint.allowedEndpointKinds) {
      Object.values(constraint.allowedEndpointKinds).forEach(Object.freeze);
      Object.freeze(constraint.allowedEndpointKinds);
    }
    if (constraint.allowedValues) Object.freeze(constraint.allowedValues);
    if (constraint.numericDomains) {
      Object.values(constraint.numericDomains).forEach(Object.freeze);
      Object.freeze(constraint.numericDomains);
    }
    Object.freeze(constraint);
  });
  if (constraints) Object.freeze(constraints);
}
Object.freeze(PARAM_VALIDATION_CONSTRAINTS);
for (const contract of Object.values(NEST_SKILL_REGISTRY)) {
  contract.paramConstraints = PARAM_VALIDATION_CONSTRAINTS[contract.id];
}
Object.setPrototypeOf(NEST_SKILL_REGISTRY, null);
for (const contract of Object.values(NEST_SKILL_REGISTRY)) {
  Object.freeze(contract.requiredInputKeys);
  Object.freeze(contract.requiredProvenanceKeys);
  contract.provenanceParamConstraints?.forEach(Object.freeze);
  if (contract.provenanceParamConstraints) {
    Object.freeze(contract.provenanceParamConstraints);
  }
  Object.freeze(contract.rendererRoutes);
  if (contract.paramConstraints) Object.freeze(contract.paramConstraints);
  contract.examples.forEach(Object.freeze);
  Object.freeze(contract.examples);
  Object.freeze(contract);
}
Object.freeze(NEST_SKILL_REGISTRY);
function getSkill(id2) {
  return isSkillId(id2) ? NEST_SKILL_REGISTRY[id2] : void 0;
}

// core/colormaps.ts
var STOPS = {
  batlow: [
    "#011959",
    "#0d2d5c",
    "#1a4260",
    "#275a60",
    "#3a6b54",
    "#52744a",
    "#6b7b3e",
    "#8a8633",
    "#a18a2b",
    "#c09036",
    "#d89448",
    "#ed9a62",
    "#faccfa"
  ],
  vik: [
    "#001261",
    "#023175",
    "#136697",
    "#3c85ac",
    "#7ba9c8",
    "#dbe5e9",
    "#dba584",
    "#ba5e2a",
    "#983307",
    "#6f1107",
    "#590008"
  ],
  viridis: [
    "#440154",
    "#472d7b",
    "#3b528b",
    "#2c728e",
    "#21918c",
    "#28ae80",
    "#5ec962",
    "#addc30",
    "#fde725"
  ],
  magma: [
    "#000004",
    "#180f3e",
    "#451077",
    "#721f81",
    "#9f2f7f",
    "#cd4071",
    "#f1605d",
    "#fd9567",
    "#feca8d",
    "#fcfdbf"
  ],
  inferno: [
    "#000004",
    "#1b0c41",
    "#4a0c6b",
    "#781c6d",
    "#a52c60",
    "#cf4446",
    "#ed6925",
    "#fb9a06",
    "#f7d13d",
    "#fcffa4"
  ],
  plasma: [
    "#0d0887",
    "#41049d",
    "#6a00a8",
    "#8f0da4",
    "#b12a90",
    "#cc4778",
    "#e16462",
    "#f2844b",
    "#fca636",
    "#fcce25",
    "#f0f921"
  ],
  cividis: [
    "#00224e",
    "#123570",
    "#3b496c",
    "#575d6d",
    "#707173",
    "#8a8779",
    "#a59c74",
    "#c3b369",
    "#e1cc55",
    "#fee838"
  ]
};
function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [v >> 16 & 255, v >> 8 & 255, v & 255];
}
var STOP_RGB = {
  batlow: STOPS.batlow.map(hexToRgb),
  vik: STOPS.vik.map(hexToRgb),
  viridis: STOPS.viridis.map(hexToRgb),
  magma: STOPS.magma.map(hexToRgb),
  inferno: STOPS.inferno.map(hexToRgb),
  plasma: STOPS.plasma.map(hexToRgb),
  cividis: STOPS.cividis.map(hexToRgb)
};
function clamp01(t) {
  if (!Number.isFinite(t)) throw new RangeError("colormap sample t must be finite");
  return t < 0 ? 0 : t > 1 ? 1 : t;
}
function sampleStops(stops, t) {
  const x = clamp01(t) * (stops.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  if (i >= stops.length - 1) {
    const endpoint = stops[stops.length - 1];
    return [endpoint[0], endpoint[1], endpoint[2]];
  }
  const a = stops[i];
  const b = stops[i + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f)
  ];
}
function turbo(t) {
  const x = clamp01(t);
  const x2 = x * x;
  const x3 = x2 * x;
  const x4 = x3 * x;
  const x5 = x4 * x;
  const r = 0.13572138 + 4.6153926 * x - 42.66032258 * x2 + 132.13108234 * x3 - 152.94239396 * x4 + 59.28637943 * x5;
  const g = 0.09140261 + 2.19418839 * x + 4.84296658 * x2 - 14.18503333 * x3 + 4.27729857 * x4 + 2.82956604 * x5;
  const b = 0.1066733 + 12.64194608 * x - 60.58204836 * x2 + 110.36276771 * x3 - 89.90310912 * x4 + 27.34824973 * x5;
  return [
    Math.round(clamp01(r) * 255),
    Math.round(clamp01(g) * 255),
    Math.round(clamp01(b) * 255)
  ];
}
function sampleColormap(name, t) {
  if (name !== "turbo" && !Object.hasOwn(STOP_RGB, name)) {
    throw new RangeError(`unknown colormap '${String(name)}'`);
  }
  if (name === "turbo") return turbo(t);
  return sampleStops(STOP_RGB[name], t);
}
function colormapHex(name, t) {
  const [r, g, b] = sampleColormap(name, t);
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}
var PALETTE_REGISTRY_POLICY = Object.freeze({
  version: "1",
  validation: "selected palette name must exist in the active runtime registry",
  manifestPalettes: "build-time discovery snapshot only",
  runtimeExtensionsAllowed: true,
  registration: "strict descriptor snapshot, validated then frozen",
  fallbackIsNotValidation: true
});
var _paletteRegistry = /* @__PURE__ */ new Map();
var CORTEXEL_PALETTE = {
  // Canvas / surfaces — the deep navy lets colors pop
  voidNavy: "#030711",
  deepNavy: "#050816",
  panel: "#0b1220",
  grid: "#1e293b",
  // Brand signal — sampled from batlow's distinctive mid-range
  cyan: "#275a60",
  // batlow(0.25) — muted teal, not Tailwind cyan
  teal: "#3a6b54",
  // batlow(0.30) — green-teal
  violet: "#faccfa",
  // batlow(1.0)  — pale magenta, the batlow endpoint
  amber: "#c09036",
  // batlow(0.55) — warm gold
  orange: "#d89448",
  // batlow(0.70) — warm amber
  pink: "#ed9a62",
  // batlow(0.80) — warm coral
  // Membrane / spikes — from batlow sequential
  membrane: "#52744a",
  // batlow(0.35) — muted biological green
  spike: "#dd954d",
  // batlow(0.78) — warm gold event marker
  spikeHot: "#ef9b67",
  // batlow(0.92) — lighter warm for spike bursts
  // Excitatory vs inhibitory — from vik diverging (Allen/MICrONS convention:
  // cool blues for E, warm reds for I)
  excitatory: "#136697",
  // vik(0.15) — cool blue
  inhibitory: "#983307",
  // vik(0.85) — warm red-brown
  // Plasticity — from vik (LTP = cool potentiation, LTD = warm depression)
  ltp: "#023175",
  // vik(0.08) — deep blue
  ltd: "#6f1107",
  // vik(0.92) — deep red
  // Text — WCAG AA on the deep-navy canvas
  ink: "#e2e8f0",
  inkDim: "#94a3b8",
  inkFaint: "#64748b"
};
Object.freeze(CORTEXEL_PALETTE);
var SEMANTIC_PALETTE_KEYS = Object.freeze(
  Object.keys(CORTEXEL_PALETTE)
);
_paletteRegistry.set("crameri", Object.freeze({
  palette: CORTEXEL_PALETTE,
  metadata: Object.freeze({
    label: "Crameri",
    source: "Crameri 2018, Nature Comms 2020 (batlow + vik)",
    diverging: true
  })
}));
function getPalette(name = "crameri") {
  const entry = _paletteRegistry.get(name);
  if (entry) return entry.palette;
  const isProduction = typeof process !== "undefined" && process.env?.NODE_ENV === "production";
  if (name && name !== "crameri" && !isProduction) {
    try {
      if (typeof console !== "undefined" && console.warn) {
        console.warn(
          `[cortexel] getPalette('${name}'): not registered, falling back to 'crameri'. Call registerPalette('${name}', ...) at app startup. Available: ${listPalettes().map((p) => p.name).join(", ")}`
        );
      }
    } catch {
    }
  }
  return CORTEXEL_PALETTE;
}
function listPalettes() {
  return [..._paletteRegistry.entries()].map(([name, entry]) => ({
    name,
    metadata: entry.metadata
  }));
}
function isRegisteredPalette(name) {
  return _paletteRegistry.has(name);
}
var CORTICAL_LAYER_COLORS = {
  L1: colormapHex("batlow", 0.05),
  "L2/3": colormapHex("batlow", 0.28),
  L4: colormapHex("batlow", 0.48),
  L5: colormapHex("batlow", 0.68),
  L6: colormapHex("batlow", 0.9)
};

// core/skills/provenanceKeys.ts
var import_zod4 = require("zod");
var PROVENANCE_KEYS = Object.freeze([
  "device_id",
  "recorded_variable",
  "units",
  "sampling_interval",
  "recorder_id",
  "sender_ids",
  "population_labels",
  "time_units",
  "source_ids",
  "target_ids",
  "synapse_model",
  "weight_units",
  "extent",
  "spatial_units",
  "mask",
  "kernel",
  "projection_sample_policy",
  "morphology_disclaimer",
  "frame_rate",
  "state_variables",
  "derivation_method",
  "model_context",
  "fixed_parameters",
  "bin_ms",
  "pair_labels",
  "correlation_normalization",
  "correlation_units",
  "stim_units",
  "rate_normalization",
  "graph_source",
  "node_kinds",
  "edge_kinds",
  "identity_advisory"
]);
var ProvenanceKeyEnum = import_zod4.z.enum(PROVENANCE_KEYS);
var STRICT_PROVENANCE_POLICY = Object.freeze({
  unknownDeclaredInputKeys: "reject",
  allowedDeclaredInputKeys: PROVENANCE_KEYS,
  requiredKeysSource: "skill.requiredProvenanceKeys",
  presentKnownValues: "validate every present known key with provenanceValueConstraints",
  requiredKeysControl: "presence only; value rules apply whether required or extra",
  normalizeBeforeValidation: true
});
var PROVENANCE_KEY_LABELS = Object.freeze({
  device_id: "device id",
  recorded_variable: "recorded variable",
  units: "units",
  sampling_interval: "sampling interval",
  recorder_id: "spike_recorder id",
  sender_ids: "sender ids",
  population_labels: "population labels",
  time_units: "time units",
  source_ids: "source ids",
  target_ids: "target ids",
  synapse_model: "synapse model",
  weight_units: "weight units",
  extent: "extent",
  spatial_units: "spatial coordinate units",
  mask: "mask",
  kernel: "kernel",
  projection_sample_policy: "projection sample policy",
  morphology_disclaimer: "morphology geometry disclaimer",
  frame_rate: "frame rate",
  state_variables: "state variables",
  derivation_method: "phase-plane derivative derivation method",
  model_context: "phase-plane model context",
  fixed_parameters: "phase-plane fixed parameters",
  bin_ms: "bin width",
  pair_labels: "pair labels",
  correlation_normalization: "correlogram normalization",
  correlation_units: "correlogram value units",
  stim_units: "stimulus units",
  rate_normalization: "rate normalization",
  graph_source: "graph source",
  node_kinds: "node kinds",
  edge_kinds: "edge kinds",
  identity_advisory: "model-identity advisory (structural similarity, not certified sameness)"
});
function isProvenanceKey(value) {
  return typeof value === "string" && PROVENANCE_KEYS.includes(value);
}
var PROVENANCE_PARAM_CONSTRAINT_LANGUAGE = Object.freeze({
  version: "1",
  evaluationOrder: Object.freeze([
    "apply provenanceValueConstraints normalization",
    "validate every present known provenance value",
    "check required provenance-key presence",
    "evaluate provenanceParamConstraints in listed order"
  ]),
  kinds: Object.freeze(["equals_param", "equals_literal"])
});
var PROVENANCE_VALUE_CONSTRAINTS = (() => {
  const constraints = /* @__PURE__ */ Object.create(null);
  for (const key of PROVENANCE_KEYS) {
    constraints[key] = { kind: "nonblank_string", normalize: "trim" };
  }
  for (const key of ["sampling_interval", "bin_ms", "frame_rate"]) {
    constraints[key] = { kind: "positive_finite_number" };
  }
  for (const key of ["device_id", "recorder_id"]) {
    constraints[key] = {
      kind: "nonnegative_safe_integer_or_nonblank_string",
      normalize: "trim"
    };
  }
  constraints.identity_advisory = { kind: "literal_true" };
  constraints.edge_kinds = { kind: "string", allowEmpty: true };
  for (const constraint of Object.values(constraints)) Object.freeze(constraint);
  return Object.freeze(constraints);
})();
function declaredProvenanceValueError(key, value) {
  const constraint = PROVENANCE_VALUE_CONSTRAINTS[key];
  switch (constraint.kind) {
    case "positive_finite_number":
      return typeof value === "number" && Number.isFinite(value) && value > 0 ? null : `${key} must be a positive finite number`;
    case "literal_true":
      return value === true ? null : "identity_advisory must be literal true (model identity is advisory)";
    case "nonnegative_safe_integer_or_nonblank_string":
      if (typeof value === "number") {
        return Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0) ? null : `${key} numeric ids must be non-negative safe integers`;
      }
      return typeof value === "string" && value.trim().length > 0 ? null : `${key} must be a non-empty string or numeric id`;
    case "string":
      return typeof value === "string" ? null : `${key} must be a string`;
    case "nonblank_string":
      return typeof value === "string" && value.trim().length > 0 ? null : `${key} must be a non-empty string`;
  }
}
function normalizeDeclaredProvenanceValue(key, value) {
  const constraint = PROVENANCE_VALUE_CONSTRAINTS[key];
  return "normalize" in constraint && constraint.normalize === "trim" && typeof value === "string" ? value.trim() : value;
}
function normalizeDeclaredProvenanceInputs(inputs) {
  const normalized = {};
  for (const key of Object.keys(inputs)) {
    const value = inputs[key];
    Object.defineProperty(normalized, key, {
      value: isProvenanceKey(key) ? normalizeDeclaredProvenanceValue(key, value) : value,
      enumerable: true,
      writable: true,
      configurable: true
    });
  }
  return normalized;
}
function provenanceParamConstraintError(constraint, params, declared) {
  if (!Object.hasOwn(declared, constraint.provenanceKey)) return null;
  const actual = declared[constraint.provenanceKey];
  if (constraint.kind === "equals_literal") {
    return Object.is(actual, constraint.value) ? null : `${constraint.provenanceKey} must equal ${JSON.stringify(constraint.value)}`;
  }
  if (!Object.hasOwn(params, constraint.paramKey)) {
    return `cannot verify ${constraint.provenanceKey}: params.${constraint.paramKey} is absent`;
  }
  const expected = params[constraint.paramKey];
  return Object.is(actual, expected) ? null : `${constraint.provenanceKey} (${JSON.stringify(actual)}) must match params.${constraint.paramKey} (${JSON.stringify(expected)})`;
}

// core/skills/paramPreflight.ts
var FLOAT32_MAX4 = 34028234663852886e22;
var MAX_SAMPLES = PARAM_LIMITS.maxSamples;
var ALLOWED_PARAM_FIELDS = Object.freeze({
  "nest.voltage_trace": ["times_ms", "series", "series_labels", "units"],
  "nest.spike_raster": ["times_ms", "senders"],
  "nest.rate_response": ["stimulus_amplitudes", "rates_hz", "stimulus_units"],
  "nest.connectivity_matrix": ["sources", "targets", "weights"],
  "nest.spatial_2d": ["positions", "coordinate_units"],
  "nest.spatial_3d": ["objects", "coordinate_units"],
  "nest.plasticity_dynamics": ["times_ms", "weights", "weight_units"],
  "nest.phase_plane": [
    "grid",
    "derivatives",
    "axis_units",
    "derivative_units",
    "axis_order",
    "flattening"
  ],
  "nest.correlogram": ["lags_ms", "correlation", "normalization", "correlation_units"],
  "nest.stimulus_response": ["times_ms", "stimulus", "response"],
  "nest.astrocyte_dynamics": ["times_ms", "ca_trace", "units"],
  "nest.compartmental_dynamics": ["times_ms", "compartments"],
  "nest.animation_replay": ["frames"],
  "corpus.knowledge_graph": ["nodes", "edges"]
});
var INVOCATION_FIELDS = /* @__PURE__ */ new Set([
  "scene",
  "skill",
  "specVersion",
  "params",
  "mode",
  "themeMode",
  "camera",
  "palette",
  "provenance",
  "rendererRoute"
]);
var PROVENANCE_FIELDS = /* @__PURE__ */ new Set([
  "source",
  "calibrated_posterior",
  "advisory_only",
  "is_paper_local_evidence",
  "caption",
  "declared_inputs",
  "synthetic"
]);
var finite = (value) => typeof value === "number" && Number.isFinite(value);
var gpu = (value) => finite(value) && Math.abs(value) <= FLOAT32_MAX4;
var id = (value) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0);
function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : void 0;
}
function largeArray(value, path, check, expected, options = {}) {
  if (!Array.isArray(value)) return null;
  const min = options.min ?? 1;
  const max = options.max ?? MAX_SAMPLES;
  if (value.length < min || value.length > max) {
    return {
      path,
      message: `expected ${min}\u2013${max} items; received ${value.length}`
    };
  }
  for (let index = 0; index < value.length; index++) {
    if (!check(value[index])) {
      return { path: `${path}.${index}`, message: `expected ${expected}` };
    }
  }
  return null;
}
function numericFields(params, fields) {
  for (const [field, check, expected] of fields) {
    const issue = largeArray(params[field], field, check, expected);
    if (issue) return issue;
  }
  return null;
}
function boundedText(value, max) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}
function preflightLargeSkillParams(skillId, params) {
  const time = (field = "times_ms") => [field, finite, "a finite number"];
  const gpuField = (field) => [field, gpu, "a finite Float32-range number"];
  const idField = (field) => [field, id, "a non-negative safe integer"];
  switch (skillId) {
    case "nest.spike_raster":
      return numericFields(params, [time(), idField("senders")]);
    case "nest.rate_response": {
      const issue = numericFields(params, [
        gpuField("stimulus_amplitudes"),
        gpuField("rates_hz")
      ]);
      if (issue) return issue;
      const rates = params.rates_hz;
      if (Array.isArray(rates)) {
        const index = rates.findIndex((rate) => typeof rate === "number" && rate < 0);
        if (index >= 0) return { path: `rates_hz.${index}`, message: "firing rates cannot be negative" };
      }
      return null;
    }
    case "nest.connectivity_matrix":
      return numericFields(params, [
        idField("sources"),
        idField("targets"),
        gpuField("weights")
      ]);
    case "nest.plasticity_dynamics":
      return numericFields(params, [time(), gpuField("weights")]);
    case "nest.astrocyte_dynamics": {
      const issue = numericFields(params, [time(), gpuField("ca_trace")]);
      if (issue) return issue;
      const trace = params.ca_trace;
      if (Array.isArray(trace)) {
        const index = trace.findIndex((sample) => typeof sample === "number" && sample < 0);
        if (index >= 0) {
          return { path: `ca_trace.${index}`, message: "absolute Ca\xB2\u207A concentration cannot be negative" };
        }
      }
      return null;
    }
    case "nest.correlogram":
      return numericFields(params, [time("lags_ms"), gpuField("correlation")]);
    case "nest.stimulus_response":
      return numericFields(params, [
        time(),
        gpuField("stimulus"),
        gpuField("response")
      ]);
    case "nest.voltage_trace": {
      const issue = numericFields(params, [time()]);
      if (issue) return issue;
      if (Array.isArray(params.series)) {
        const outer = largeArray(
          params.series,
          "series",
          (series) => Array.isArray(series) && series.length >= 1 && series.length <= MAX_SAMPLES,
          "a non-empty numeric series",
          { max: 256 }
        );
        if (outer) return outer;
        for (let index = 0; index < params.series.length; index++) {
          const nested = largeArray(
            params.series[index],
            `series.${index}`,
            gpu,
            "a finite Float32-range number"
          );
          if (nested) return nested;
        }
      }
      const labels = largeArray(
        params.series_labels,
        "series_labels",
        (label) => boundedText(label, 120),
        "a bounded non-blank label",
        { max: 256 }
      );
      if (labels) return labels;
      return null;
    }
    case "nest.phase_plane": {
      for (const field of ["grid", "derivatives"]) {
        const collection = record(params[field]);
        if (!collection) continue;
        for (const [name, values] of Object.entries(collection)) {
          const issue = largeArray(
            values,
            `${field}.${name}`,
            gpu,
            "a finite Float32-range number"
          );
          if (issue) return issue;
        }
      }
      return null;
    }
    case "nest.spatial_2d":
      return largeArray(
        params.positions,
        "positions",
        (position) => Array.isArray(position) && position.length === 2 && position.every(gpu),
        "an exact [x,y] Float32-range tuple",
        { max: PARAM_LIMITS.maxSpatialObjects }
      );
    case "nest.spatial_3d":
      return largeArray(
        params.objects,
        "objects",
        (object) => {
          const item = record(object);
          return !!item && gpu(item.x) && gpu(item.y) && gpu(item.z);
        },
        "an object with finite Float32-range x/y/z",
        { max: PARAM_LIMITS.maxSpatialObjects }
      );
    case "nest.compartmental_dynamics": {
      const issue = numericFields(params, [time()]);
      if (issue) return issue;
      if (Array.isArray(params.compartments)) {
        const outer = largeArray(
          params.compartments,
          "compartments",
          (compartment) => {
            const item = record(compartment);
            if (!item) return false;
            const keys = Object.keys(item);
            return keys.every((key) => ["id", "parent_id", "label", "values"].includes(key)) && boundedText(item.id, 120) && (item.parent_id === null || boundedText(item.parent_id, 120)) && (item.label === void 0 || boundedText(item.label, 240)) && Array.isArray(item.values) && item.values.length >= 1;
          },
          "a closed compartment with id, parent_id, and non-empty values",
          { max: 256 }
        );
        if (outer) return outer;
        for (let index = 0; index < params.compartments.length; index++) {
          const item = record(params.compartments[index]);
          if (!item) continue;
          const nested = largeArray(
            item.values,
            `compartments.${index}.values`,
            gpu,
            "a finite Float32-range number"
          );
          if (nested) return nested;
        }
      }
      return null;
    }
    case "nest.animation_replay":
      return largeArray(
        params.frames,
        "frames",
        (frame) => {
          const item = record(frame);
          const state = item ? record(item.state) : void 0;
          return !!item && Object.keys(item).every((key) => ["time_ms", "state", "annotation"].includes(key)) && finite(item.time_ms) && item.time_ms >= 0 && !!state && Object.keys(state).length > 0 && Object.keys(state).every(
            (key) => key.length >= 1 && key.length <= 80 && key.trim() === key
          ) && (item.annotation === void 0 || boundedText(item.annotation, 500));
        },
        "a frame with non-negative time_ms and an object state",
        { max: 1e4 }
      );
    case "corpus.knowledge_graph": {
      const nodeKinds = /* @__PURE__ */ new Set(["paper", "model", "family"]);
      const edgeKinds = /* @__PURE__ */ new Set([
        "cites",
        "same_as",
        "variant_of",
        "instantiates",
        "belongs_to_family"
      ]);
      return largeArray(
        params.nodes,
        "nodes",
        (node) => {
          const item = record(node);
          return !!item && Object.keys(item).every((key) => ["id", "kind", "label"].includes(key)) && Object.keys(item).length === 3 && boundedText(item.id, 120) && boundedText(item.label, 240) && nodeKinds.has(item.kind);
        },
        "a bounded paper/model/family node",
        { max: PARAM_LIMITS.maxGraphNodes }
      ) ?? largeArray(
        params.edges,
        "edges",
        (edge) => {
          const item = record(edge);
          return !!item && Object.keys(item).every((key) => ["source", "target", "kind"].includes(key)) && Object.keys(item).length === 3 && boundedText(item.source, 120) && boundedText(item.target, 120) && edgeKinds.has(item.kind);
        },
        "a bounded knowledge-graph edge",
        { min: 0, max: PARAM_LIMITS.maxGraphEdges }
      );
    }
    default:
      return null;
  }
}
function preflightRawSkillParams(skillId, params) {
  if (params === null || typeof params !== "object" || Array.isArray(params)) {
    return null;
  }
  const prototype = Object.getPrototypeOf(params);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const allowed = ALLOWED_PARAM_FIELDS[skillId];
  if (allowed) {
    const allowedSet = new Set(allowed);
    const fields = Reflect.ownKeys(params);
    if (fields.some((field) => typeof field !== "string" || !allowedSet.has(field))) {
      return {
        path: "(root)",
        message: "params contain an unknown, symbol, or unsupported top-level field"
      };
    }
  }
  const ownValue = (key) => {
    const descriptor = Object.getOwnPropertyDescriptor(params, key);
    return descriptor && "value" in descriptor && descriptor.enumerable ? descriptor.value : void 0;
  };
  const arrayLength = (value) => {
    if (!Array.isArray(value)) return void 0;
    const length = Object.getOwnPropertyDescriptor(value, "length");
    return length && "value" in length && Number.isSafeInteger(length.value) ? length.value : void 0;
  };
  const tooLongValue = (value, path, max) => {
    const length = arrayLength(value);
    return length !== void 0 && length > max ? { path, message: `${path} may contain at most ${max} items` } : null;
  };
  const tooLong = (key, max) => {
    return tooLongValue(ownValue(key), key, max);
  };
  const tooManyKeys = (key, max) => {
    const value = ownValue(key);
    if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
    const count = Reflect.ownKeys(value).length;
    return count > max ? { path: key, message: `${key} may contain at most ${max} properties` } : null;
  };
  const directArrays = (fields, max = MAX_SAMPLES) => {
    for (const field of fields) {
      const issue = tooLong(field, max);
      if (issue) return issue;
    }
    return null;
  };
  const nestedArrays = (outerKey, outerMax, innerKey) => {
    const outer = ownValue(outerKey);
    const outerIssue = tooLongValue(outer, outerKey, outerMax);
    if (outerIssue || !Array.isArray(outer)) return outerIssue;
    const length = arrayLength(outer);
    if (length === void 0 || length > outerMax) return null;
    for (let index = 0; index < length; index++) {
      const itemDescriptor = Object.getOwnPropertyDescriptor(outer, String(index));
      if (!itemDescriptor || !("value" in itemDescriptor) || !itemDescriptor.enumerable) {
        continue;
      }
      let nested = itemDescriptor.value;
      if (innerKey) {
        if (nested === null || typeof nested !== "object" || Array.isArray(nested)) continue;
        const descriptor = Object.getOwnPropertyDescriptor(nested, innerKey);
        nested = descriptor && "value" in descriptor && descriptor.enumerable ? descriptor.value : void 0;
      }
      const issue = tooLongValue(
        nested,
        innerKey ? `${outerKey}.${index}.${innerKey}` : `${outerKey}.${index}`,
        MAX_SAMPLES
      );
      if (issue) return issue;
    }
    return null;
  };
  const recordValueArrays = (key) => {
    const collection = ownValue(key);
    if (collection === null || typeof collection !== "object" || Array.isArray(collection)) {
      return null;
    }
    const keys = Reflect.ownKeys(collection);
    if (keys.length > 2) {
      return { path: key, message: `${key} may contain at most 2 properties` };
    }
    for (const name of keys) {
      if (typeof name !== "string") continue;
      const descriptor = Object.getOwnPropertyDescriptor(collection, name);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) continue;
      const issue = tooLongValue(descriptor.value, `${key}.${name}`, MAX_SAMPLES);
      if (issue) return issue;
    }
    return null;
  };
  switch (skillId) {
    case "nest.voltage_trace":
      return directArrays(["times_ms"]) ?? nestedArrays("series", PARAM_LIMITS.maxSeries) ?? tooLong("series_labels", PARAM_LIMITS.maxSeries);
    case "nest.spike_raster":
      return directArrays(["times_ms", "senders"]);
    case "nest.rate_response":
      return directArrays(["stimulus_amplitudes", "rates_hz"]);
    case "nest.connectivity_matrix":
      return directArrays(["sources", "targets", "weights"]);
    case "nest.spatial_2d":
      return tooLong("positions", PARAM_LIMITS.maxSpatialObjects);
    case "nest.spatial_3d":
      return tooLong("objects", PARAM_LIMITS.maxSpatialObjects);
    case "nest.plasticity_dynamics":
      return directArrays(["times_ms", "weights"]);
    case "nest.compartmental_dynamics":
      return directArrays(["times_ms"]) ?? nestedArrays("compartments", PARAM_LIMITS.maxSeries, "values");
    case "nest.correlogram":
      return directArrays(["lags_ms", "correlation"]);
    case "nest.stimulus_response":
      return directArrays(["times_ms", "stimulus", "response"]);
    case "nest.astrocyte_dynamics":
      return directArrays(["times_ms", "ca_trace"]);
    case "nest.animation_replay":
      return tooLong("frames", 1e4);
    case "corpus.knowledge_graph":
      return tooLong("nodes", PARAM_LIMITS.maxGraphNodes) ?? tooLong("edges", PARAM_LIMITS.maxGraphEdges);
    case "nest.phase_plane":
      return tooManyKeys("grid", 2) ?? tooManyKeys("derivatives", 2) ?? tooManyKeys("axis_units", 2) ?? tooManyKeys("derivative_units", 2) ?? recordValueArrays("grid") ?? recordValueArrays("derivatives") ?? tooLong("axis_order", 2);
    default:
      return null;
  }
}
function preflightRawEnvelopeParams(skillId, payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const prototype = Object.getPrototypeOf(payload);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const fields = Reflect.ownKeys(payload);
  if (fields.some((field) => typeof field !== "string" || !INVOCATION_FIELDS.has(field))) {
    return {
      scope: "envelope",
      path: "(root)",
      message: "invocation contains an unknown, symbol, or unsupported top-level field"
    };
  }
  const provenance = Object.getOwnPropertyDescriptor(payload, "provenance");
  if (provenance && "value" in provenance && provenance.enumerable && provenance.value !== null && typeof provenance.value === "object" && !Array.isArray(provenance.value)) {
    const provenancePrototype = Object.getPrototypeOf(provenance.value);
    if (provenancePrototype === Object.prototype || provenancePrototype === null) {
      const provenanceFields = Reflect.ownKeys(provenance.value);
      if (provenanceFields.some(
        (field) => typeof field !== "string" || !PROVENANCE_FIELDS.has(field)
      )) {
        return {
          scope: "envelope",
          path: "provenance",
          message: "provenance contains an unknown, symbol, or unsupported field"
        };
      }
    }
  }
  const descriptor = Object.getOwnPropertyDescriptor(payload, "params");
  const issue = descriptor && "value" in descriptor && descriptor.enumerable ? preflightRawSkillParams(skillId, descriptor.value) : null;
  return issue ? { ...issue, scope: "params" } : null;
}

// core/skills/validateSkillInvocation.ts
function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const row = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      row[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, row[j], row[j - 1]);
      prev = tmp;
    }
  }
  return row[n];
}
function nearestSkill(id2) {
  if (id2.length === 0 || id2.length > 80) return void 0;
  let best;
  let bestD = Infinity;
  for (const candidate of NEST_SKILL_IDS) {
    const d = editDistance(id2, candidate);
    if (d < bestD) {
      bestD = d;
      best = candidate;
    }
  }
  return best !== void 0 && bestD <= Math.max(3, Math.ceil(id2.length * 0.4)) ? best : void 0;
}
var MAX_INVOCATION_ERRORS = 32;
function printable(value) {
  try {
    const text = typeof value === "string" ? value : String(value);
    return text.length <= 120 ? text : `${text.slice(0, 117)}\u2026`;
  } catch {
    return "<unprintable value>";
  }
}
function validateSkillInvocationUnsafe(skillId, payload) {
  const errors = [];
  const contract = getSkill(skillId);
  if (!contract) {
    const suggestion = typeof skillId === "string" ? nearestSkill(skillId) : void 0;
    return {
      ok: false,
      errors: [
        {
          code: "unknown_skill",
          path: "skillId",
          message: `unknown skill '${printable(skillId)}'`,
          hint: suggestion ? `Did you mean '${suggestion}'? Otherwise use one of the ids in validSkills.` : "Use one of the ids in validSkills (nest.* and corpus.*).",
          validSkills: NEST_SKILL_IDS,
          didYouMean: suggestion,
          // Attach the nearest skill's example so a typo self-repairs in one shot.
          example: suggestion ? getInvocationExamplePayload(suggestion) : void 0
        }
      ]
    };
  }
  if (contract.scene === null) {
    return {
      ok: false,
      errors: [
        {
          code: "no_cortexel_scene",
          path: "skillId",
          message: `skill '${skillId}' has no Cortexel scene (route to a host renderer)`,
          hint: `Renderer routes: ${contract.rendererRoutes.join(", ")}.`
        }
      ]
    };
  }
  const example = getExamplePayload(contract.id);
  const rawParamPreflight = preflightRawEnvelopeParams(contract.id, payload);
  if (rawParamPreflight) {
    const envelopeIssue = rawParamPreflight.scope === "envelope";
    return {
      ok: false,
      errors: [{
        code: envelopeIssue ? "invalid_envelope" : "invalid_params",
        path: envelopeIssue ? rawParamPreflight.path : `params.${rawParamPreflight.path}`,
        message: rawParamPreflight.message,
        hint: envelopeIssue ? "Use only fields declared by the strict invocation envelope." : `Required params: ${contract.requiredInputKeys.join(", ")}.`,
        example
      }]
    };
  }
  const rawProvenance = readOwnEnumerableDataProperty(payload, "provenance");
  const rawCalibrated = rawProvenance.kind === "value" ? readOwnEnumerableDataProperty(rawProvenance.value, "calibrated_posterior") : { kind: "absent" };
  if (rawCalibrated.kind === "value" && rawCalibrated.value === true) {
    return {
      ok: false,
      errors: [
        {
          code: "calibrated_posterior_unsupported",
          path: "provenance.calibrated_posterior",
          message: "calibrated_posterior=true is not implemented and is rejected at the visualization boundary",
          hint: "Validation/search is candidate ranking; leave calibrated_posterior=false.",
          example
        }
      ]
    };
  }
  const rawVersionProperty = readOwnEnumerableDataProperty(payload, "specVersion");
  const rawVersion = rawVersionProperty.kind === "value" ? rawVersionProperty.value : void 0;
  if (rawVersionProperty.kind === "value" && rawVersion !== CORTEXEL_SPEC_VERSION) {
    return {
      ok: false,
      errors: [
        {
          code: "unsupported_spec_version",
          path: "specVersion",
          message: `unsupported spec version '${printable(rawVersion)}'`,
          hint: `Use '${CORTEXEL_SPEC_VERSION}', or omit specVersion for a legacy envelope.`,
          example
        }
      ]
    };
  }
  const envelope = validateVizSpec(payload);
  if (!envelope.ok) {
    return {
      ok: false,
      errors: envelope.errors.slice(0, MAX_INVOCATION_ERRORS).map((formatted, index) => {
        const separator = formatted.indexOf(": ");
        const path = separator >= 0 ? formatted.slice(0, separator) : "(spec)";
        const message = separator >= 0 ? formatted.slice(separator + 2) : formatted;
        return {
          code: "invalid_envelope",
          path,
          message,
          hint: "Match the VizSpec envelope shape shown in the attached skill example.",
          validScenes: SCENE_NAMES,
          example: index === 0 ? example : void 0
        };
      })
    };
  }
  let spec = envelope.spec;
  if (spec.skill && spec.skill !== skillId) {
    errors.push({
      code: "skill_mismatch",
      path: "skill",
      message: `spec.skill '${spec.skill}' does not match the skill '${skillId}' it is being validated under`,
      hint: `Validate this spec with skillId '${spec.skill}', or set spec.skill to '${skillId}'.`,
      example
    });
  }
  if (spec.scene !== contract.scene) {
    errors.push({
      code: "scene_mismatch",
      path: "scene",
      message: `scene '${spec.scene}' does not match skill '${skillId}' scene '${contract.scene}'`,
      hint: `Set scene: '${contract.scene}'.`,
      validScenes: [contract.scene],
      example
    });
  }
  if (contract.paramsSchema) {
    const preflight = preflightLargeSkillParams(contract.id, spec.params);
    const parsed = preflight ? void 0 : contract.paramsSchema.safeParse(spec.params);
    if (preflight) {
      errors.push({
        code: "invalid_params",
        path: `params.${preflight.path}`,
        message: preflight.message,
        hint: `Required params: ${contract.requiredInputKeys.join(", ")}.`,
        example
      });
    } else if (parsed && !parsed.success) {
      const issues = parsed.error.issues;
      const available = Math.max(0, MAX_INVOCATION_ERRORS - errors.length);
      const detailedCount = Math.min(issues.length, Math.max(0, available - 1));
      for (const issue of issues.slice(0, detailedCount)) {
        const bounded = boundValidationIssue(issue);
        errors.push({
          code: "invalid_params",
          path: `params.${bounded.path}`,
          message: bounded.message,
          hint: `Required params: ${contract.requiredInputKeys.join(", ")}.`,
          // One example is enough; repeating it on every issue bloats serialized
          // tool output quadratically for malformed arrays.
          example: errors.some((error) => error.example) ? void 0 : example
        });
      }
      if (issues.length > detailedCount && errors.length < MAX_INVOCATION_ERRORS) {
        errors.push({
          code: "invalid_params",
          path: "params.(root)",
          message: `additional validation issues omitted after ${MAX_INVOCATION_ERRORS} errors`,
          hint: "Fix the reported shape first, then validate again."
        });
      }
    } else if (parsed?.success) {
      spec = { ...spec, params: parsed.data };
    }
  }
  let prov = spec.provenance;
  const declared = normalizeDeclaredProvenanceInputs(
    prov.declared_inputs ?? {}
  );
  if (prov.declared_inputs) {
    prov = { ...prov, declared_inputs: declared };
    spec = { ...spec, provenance: prov };
  }
  const invalidDeclaredKeys = /* @__PURE__ */ new Set();
  for (const key of Object.keys(declared)) {
    if (errors.length >= MAX_INVOCATION_ERRORS) break;
    if (!isProvenanceKey(key)) {
      invalidDeclaredKeys.add(key);
      errors.push({
        code: "invalid_provenance",
        path: `provenance.declared_inputs.${key}`,
        message: `unknown declared provenance key '${key}'`,
        hint: "Use only keys from PROVENANCE_KEYS and the selected skill contract.",
        example: errors.some((error) => error.example) ? void 0 : example
      });
      continue;
    }
    const message = declaredProvenanceValueError(key, declared[key]);
    if (message) {
      invalidDeclaredKeys.add(key);
      errors.push({
        code: "invalid_provenance",
        path: `provenance.declared_inputs.${key}`,
        message,
        hint: `Declare a meaningful value for '${key}' that matches its provenance constraint.`,
        example: errors.some((error) => error.example) ? void 0 : example
      });
    }
  }
  for (const key of contract.requiredProvenanceKeys) {
    if (errors.length >= MAX_INVOCATION_ERRORS) break;
    if (!Object.hasOwn(declared, key)) {
      invalidDeclaredKeys.add(key);
      errors.push({
        code: "missing_provenance",
        path: `provenance.declared_inputs.${key}`,
        message: `missing required provenance: ${key}`,
        hint: `Skill '${skillId}' requires declared_inputs for: ${contract.requiredProvenanceKeys.join(", ")}.`,
        example: errors.some((error) => error.example) ? void 0 : example
      });
    }
  }
  if (!errors.some((error) => error.code === "invalid_params")) {
    for (const constraint of contract.provenanceParamConstraints ?? []) {
      if (errors.length >= MAX_INVOCATION_ERRORS) break;
      if (invalidDeclaredKeys.has(constraint.provenanceKey)) continue;
      const message = provenanceParamConstraintError(
        constraint,
        spec.params,
        declared
      );
      if (message) {
        errors.push({
          code: "invalid_provenance",
          path: `provenance.declared_inputs.${constraint.provenanceKey}`,
          message,
          hint: constraint.description,
          example: errors.some((error) => error.example) ? void 0 : example
        });
      }
    }
  }
  if (spec.palette && !isRegisteredPalette(spec.palette)) {
    errors.push({
      code: "unknown_palette",
      path: "palette",
      message: `palette '${spec.palette}' is not registered`,
      hint: `Use one of: ${listPalettes().map((p) => p.name).join(", ")}.`,
      validPalettes: listPalettes().map((p) => p.name),
      example
    });
  }
  if (errors.length > 0) return { ok: false, errors };
  let caption = requiresHonestyCaption(prov) ? defaultHonestyCaption(prov) : null;
  if (contract.weak) {
    const weakMsg = contract.weakDisclosure ?? `Derived view \u2014 ${skillId} reuses the '${contract.scene}' scene; not a 1:1 rendering.`;
    caption = caption ? `${weakMsg} ${caption}` : weakMsg;
  }
  return {
    ok: true,
    spec,
    skill: contract.id,
    scene: contract.scene,
    caption
  };
}
function validateSkillInvocation(skillId, payload) {
  try {
    return validateSkillInvocationUnsafe(skillId, payload);
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          code: "invalid_envelope",
          path: "(spec)",
          message: `validation could not safely inspect the payload: ${safeErrorMessage(error)}`,
          validScenes: SCENE_NAMES
        }
      ]
    };
  }
}

// core/skills/authoring.ts
function validateSpec(payload) {
  let skillProperty;
  try {
    skillProperty = readOwnEnumerableDataProperty(payload, "skill");
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          code: "invalid_envelope",
          path: "(spec)",
          message: `validation could not safely inspect spec.skill: ${safeErrorMessage(error)}`
        }
      ]
    };
  }
  const skill = skillProperty.kind === "value" ? skillProperty.value : void 0;
  const normalizedSkill = typeof skill === "string" && skill.length <= 80 ? skill.trim() : skill;
  if (typeof normalizedSkill !== "string" || normalizedSkill.length === 0) {
    return {
      ok: false,
      errors: [
        {
          code: "unknown_skill",
          path: "skill",
          message: "spec has no `skill` field \u2014 validateSpec needs a self-describing spec",
          hint: "Set spec.skill to a skill id (see validSkills), or call validateSkillInvocation(skillId, spec) with an explicit id.",
          validSkills: SKILL_IDS
        }
      ]
    };
  }
  return validateSkillInvocation(normalizedSkill, payload);
}

// react/VizSpecRenderer.tsx
var import_jsx_runtime4 = require("react/jsx-runtime");
function cloneValidatedJson(value) {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}
function VizSpecRenderer({
  spec,
  renderScene,
  skillId,
  trustedEnvelope = false,
  active = true,
  activePalette,
  onError,
  onInvocationError
}) {
  let embeddedSkillProperty;
  try {
    embeddedSkillProperty = readOwnEnumerableDataProperty(spec, "skill");
  } catch {
    embeddedSkillProperty = { kind: "absent" };
  }
  const hasEmbeddedSkill = embeddedSkillProperty.kind === "value";
  const embeddedSkill = embeddedSkillProperty.kind === "value" ? embeddedSkillProperty.value : void 0;
  const effectiveSkillId = skillId !== void 0 ? skillId : hasEmbeddedSkill ? typeof embeddedSkill === "string" ? embeddedSkill.length <= 80 ? embeddedSkill.trim() : embeddedSkill : embeddedSkill : void 0;
  const validation = (0, import_react5.useMemo)(() => effectiveSkillId !== void 0 ? {
    kind: "strict",
    result: validateSkillInvocation(effectiveSkillId, spec)
  } : !trustedEnvelope ? {
    kind: "strict",
    result: validateSpec(spec)
  } : {
    kind: "plain",
    result: validateVizSpec(spec)
  }, [effectiveSkillId, spec, trustedEnvelope]);
  if (validation.kind === "strict") {
    const gated = validation.result;
    if (!gated.ok) {
      const messages = gated.errors.map((e) => `${e.path}: ${e.message}`);
      return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        ValidationError,
        {
          title: "Invalid skill invocation",
          messages,
          errors: gated.errors,
          onError,
          onInvocationError
        }
      );
    }
    const palette2 = gated.spec.palette ? getPalette(gated.spec.palette) : activePalette ?? getPalette("crameri");
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      SceneFrame,
      {
        skill: gated.skill,
        scene: gated.scene,
        themeMode: gated.spec.themeMode,
        mode: gated.spec.mode,
        camera: gated.spec.camera,
        palette: palette2,
        params: gated.spec.params,
        provenance: gated.spec.provenance,
        caption: gated.caption,
        active,
        renderScene
      }
    );
  }
  const result = validation.result;
  if (!result.ok) {
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      ValidationError,
      {
        title: "Invalid VizSpec",
        messages: result.errors,
        onError
      }
    );
  }
  const { scene, themeMode, mode, camera, provenance, params, palette: paletteHint } = result.spec;
  const caption = requiresHonestyCaption(provenance) ? defaultHonestyCaption(provenance) : null;
  const palette = paletteHint ? getPalette(paletteHint) : activePalette ?? getPalette("crameri");
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    SceneFrame,
    {
      skill: result.spec.skill,
      scene,
      themeMode,
      mode,
      camera,
      palette,
      params,
      provenance,
      caption,
      active,
      renderScene
    }
  );
}
function ValidationError({
  title,
  messages,
  errors,
  onError,
  onInvocationError
}) {
  const contentKey = errors ? JSON.stringify(errors) : messages.join("\n");
  const onErrorRef = (0, import_react5.useRef)(onError);
  const onInvocationErrorRef = (0, import_react5.useRef)(onInvocationError);
  const reportedKeyRef = (0, import_react5.useRef)(null);
  (0, import_react5.useEffect)(() => {
    onErrorRef.current = onError;
    onInvocationErrorRef.current = onInvocationError;
  }, [onError, onInvocationError]);
  (0, import_react5.useEffect)(() => {
    if (reportedKeyRef.current === contentKey) return;
    reportedKeyRef.current = contentKey;
    onErrorRef.current?.([...messages]);
    if (errors) onInvocationErrorRef.current?.(errors);
  }, [contentKey]);
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { role: "alert", "aria-live": "assertive", className: "cortexel-vizspec-error", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("strong", { children: title }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { children: "Fix the fields below and validate the visualization again." }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("ul", { children: messages.map((message, index) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("li", { children: message }, `${index}-${message}`)) })
  ] });
}
function SceneFrame({
  skill,
  scene,
  themeMode,
  mode,
  camera,
  palette,
  params,
  provenance,
  caption,
  active,
  renderScene
}) {
  if (mode === "export") {
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { role: "status", className: "cortexel-vizspec-export-unsupported", children: "Headless export rendering is not available in this build. Request an interactive render, or use the backend render endpoint once enabled." });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
    "div",
    {
      className: "cortexel-vizspec",
      style: { position: "relative", width: "100%", height: "100%" },
      children: [
        renderScene({
          skill,
          scene,
          themeMode,
          active,
          camera,
          palette,
          params: cloneValidatedJson(params),
          provenance: cloneValidatedJson(provenance)
        }),
        caption && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
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
            children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("bdi", { dir: "auto", style: { unicodeBidi: "isolate" }, children: caption })
          }
        )
      ]
    }
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
});
//# sourceMappingURL=index.cjs.map