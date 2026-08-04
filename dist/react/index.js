import { u as safeDiagnosticText } from "../knowledgeGraphLimits-Du09-etI.js";
import { t as VizSpecRenderer } from "../VizSpecRenderer-BLGU6OQa.js";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";

//#region react/usePopulationExpand.ts
function usePopulationExpand(controlled) {
	const [localSelected, setLocalSelected] = useState(null);
	const [localHovered, setLocalHovered] = useState(null);
	const selectedPopId = controlled ? controlled.selectedPopId : localSelected;
	const hoveredPopId = controlled ? controlled.hoveredPopId : localHovered;
	const setSelectedPopId = controlled ? controlled.setSelectedPopId : setLocalSelected;
	const setHoveredPopId = controlled ? controlled.setHoveredPopId : setLocalHovered;
	return {
		selectedPopId,
		hoveredPopId,
		setSelectedPopId,
		setHoveredPopId,
		isSelected: (id) => selectedPopId === id,
		isHovered: (id) => hoveredPopId === id,
		isAnySelected: () => selectedPopId !== null,
		toggleSelected: useCallback((id) => setSelectedPopId(selectedPopId === id ? null : id), [selectedPopId, setSelectedPopId]),
		reset: useCallback(() => {
			setSelectedPopId(null);
			setHoveredPopId(null);
		}, [setSelectedPopId, setHoveredPopId])
	};
}

//#endregion
//#region react/ExpandablePopulation.tsx
const MAX_POPULATION_SIZE = 1e4;
const FLOAT32_MAX$1 = 34028234663852886e22;
function validatePopulationGeometry(position, size) {
	if (position.some((value) => !Number.isFinite(value) || Math.abs(value) > FLOAT32_MAX$1)) throw new RangeError("population position must contain finite Float32-range coordinates");
	if (!Number.isFinite(size) || size <= 0 || size > 1e4) throw new RangeError(`population size must be a positive finite number <= ${MAX_POPULATION_SIZE}`);
}
function ExpandablePopulation({ position, color, isSelected, isAnySelected, isHovered, onHover, onClick, themeMode, size = .3, reducedMotion = false }) {
	validatePopulationGeometry(position, size);
	const meshRef = useRef(null);
	const ringRef = useRef(null);
	const initialScale = isSelected ? 0 : isAnySelected ? .5 : 1;
	const initialOpacity = isSelected ? 0 : isAnySelected ? .05 : 1;
	const scaleRef = useRef(initialScale);
	const opacityRef = useRef(initialOpacity);
	const onHoverRef = useRef(onHover);
	useEffect(() => {
		onHoverRef.current = onHover;
	}, [onHover]);
	useEffect(() => () => onHoverRef.current(false), []);
	const colorObj = useMemo(() => new THREE.Color(color), [color]);
	const voxelColor = useMemo(() => colorObj.clone().multiplyScalar(.82), [colorObj]);
	const ringColor = useMemo(() => themeMode === "light" ? colorObj.clone().multiplyScalar(.8) : colorObj.clone(), [colorObj, themeMode]);
	const ringInner = size * .867;
	const ringOuter = size * 1.067;
	useLayoutEffect(() => {
		meshRef.current.scale.setScalar(scaleRef.current);
		meshRef.current.material.opacity = opacityRef.current;
		ringRef.current.scale.set(scaleRef.current, scaleRef.current, 1);
		ringRef.current.material.opacity = opacityRef.current > .01 ? opacityRef.current * .25 : 0;
	}, []);
	useFrame((state, delta) => {
		let targetScale = 1;
		let targetOpacity = 1;
		if (isSelected) {
			targetScale = 0;
			targetOpacity = 0;
		} else if (isAnySelected) {
			targetScale = .5;
			targetOpacity = .05;
		} else if (isHovered) {
			targetScale = 1.25;
			targetOpacity = 1;
		}
		const lerp = reducedMotion ? 1 : 1 - Math.exp(-9.75 * Math.min(delta, .1));
		scaleRef.current += (targetScale - scaleRef.current) * lerp;
		opacityRef.current += (targetOpacity - opacityRef.current) * lerp;
		if (meshRef.current) {
			const breathe = reducedMotion || !isHovered ? 1 : 1 + Math.sin(state.clock.elapsedTime * 4) * .09;
			meshRef.current.scale.setScalar(scaleRef.current * breathe);
			const mat = meshRef.current.material;
			mat.opacity = opacityRef.current;
		}
		if (ringRef.current && opacityRef.current > .01) {
			const ringMat = ringRef.current.material;
			if (reducedMotion || !isHovered) {
				ringRef.current.scale.set(scaleRef.current, scaleRef.current, 1);
				ringMat.opacity = opacityRef.current * .25;
			} else {
				const ringTime = state.clock.elapsedTime * 1.5 % 1;
				const ringScale = scaleRef.current * (1 + ringTime * 1.2);
				ringRef.current.scale.set(ringScale, ringScale, 1);
				ringMat.opacity = opacityRef.current * (1 - ringTime) * .4;
			}
		} else if (ringRef.current) ringRef.current.material.opacity = 0;
		if (!reducedMotion && (isHovered || Math.abs(targetScale - scaleRef.current) > .001 || Math.abs(targetOpacity - opacityRef.current) > .001)) state.invalidate();
	});
	return /* @__PURE__ */ jsxs("group", {
		position,
		children: [/* @__PURE__ */ jsxs("mesh", {
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
			children: [/* @__PURE__ */ jsx("boxGeometry", { args: [
				size,
				size,
				size
			] }), /* @__PURE__ */ jsx("meshBasicMaterial", {
				color: voxelColor,
				transparent: true,
				toneMapped: true,
				fog: false
			})]
		}), /* @__PURE__ */ jsxs("mesh", {
			ref: ringRef,
			rotation: [
				-Math.PI / 2,
				0,
				0
			],
			children: [/* @__PURE__ */ jsx("ringGeometry", { args: [
				ringInner,
				ringOuter,
				32
			] }), /* @__PURE__ */ jsx("meshBasicMaterial", {
				color: ringColor,
				transparent: true,
				depthWrite: false,
				side: THREE.DoubleSide
			})]
		})]
	});
}

//#endregion
//#region react/neuronShaders.ts
const NEURON_VERT = `
attribute float neuronIndex;
attribute vec2 neuronActivity;

uniform float uExpansion;
uniform float uSelectedNeuronIndex;
uniform float uRevealCount;   // total neuron count — normalizes the reveal ramp

varying float vMembranePotential;
varying float vSpikeIntensity;
varying float vIsSelected;

void main() {
  // Caller-supplied normalized activity snapshot. Missing attributes are filled
  // with zeros by ExpandableNeurons — never synthesize scientific activity just
  // to make a measured figure look lively.
  vMembranePotential = clamp(neuronActivity.x, 0.0, 1.0);
  vSpikeIntensity = clamp(neuronActivity.y, 0.0, 1.0);

  vIsSelected = abs(neuronIndex - uSelectedNeuronIndex) < 0.1 ? 1.0 : 0.0;

  // Progressive reveal: a small core shows first, outer rows fade in with
  // uExpansion. The ramp is normalized by the ACTUAL neuron count (uRevealCount),
  // so the last row always reaches full visibility at uExpansion=1 — a fixed
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
`;
const NEURON_FRAG = `
varying float vMembranePotential;
varying float vSpikeIntensity;
varying float vIsSelected;

uniform vec3 uBaseColor;
uniform vec3 uSpikeColor;
uniform float uOpacity;   // cluster→grid fade-in (custom ShaderMaterial: not auto-applied)

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

  // Spike flash — coloured bloom, capped ~1.15 luminance to stay under the
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

  // Selected neuron — gold halo ring.
  if (vIsSelected > 0.5) {
    if (dist > 0.40) {
      float ring = smoothstep(0.40, 0.43, dist);
      color = mix(color, vec3(1.15, 1.0, 0.36), ring);
      alpha = 1.0;
    }
    color += vec3(0.25, 0.22, 0.05);
  }

  // A raw ShaderMaterial does NOT auto-multiply by material.opacity, so the
  // cluster→grid fade must be applied explicitly here from the uOpacity uniform.
  float outputCeiling = (vSpikeIntensity > 0.001 || vIsSelected > 0.5) ? 1.15 : 1.0;
  gl_FragColor = vec4(clamp(color, vec3(0.0), vec3(outputCeiling)), alpha * uOpacity);
}
`;

//#endregion
//#region react/ExpandableNeurons.tsx
/** Cluster scale at full collapse (uExpansion=0). Mirrors the vertex shader. */
const NEURON_CLUSTER_SCALE = .06;
const MAX_NEURON_POINTS = 1e6;
const MAX_INTERACTIVE_NEURON_POINTS = 25e3;
const FLOAT32_MAX = 34028234663852886e22;
/** World scale factor for a neuron's local offset at a given expansion (0..1).
*  Matches the shader's `mix(0.06, 1.0, uExpansion)`. */
function neuronExpandedScale(expansion) {
	if (!Number.isFinite(expansion)) throw new RangeError("expansion must be a finite number");
	return NEURON_CLUSTER_SCALE + .94 * Math.min(1, Math.max(0, expansion));
}
/** Build a centered 3D cubic layout for exactly `count` neurons. The enclosing
*  side length is cubic, but unused tail cells are never allocated or rendered:
*  Cortexel must not invent neurons merely to fill a perfect cube. */
function neuronLocalGrid(count, spacing = .4) {
	if (!Number.isSafeInteger(count) || count < 0 || count > 1e6) throw new RangeError(`count must be a non-negative safe integer <= ${MAX_NEURON_POINTS}`);
	if (!Number.isFinite(spacing) || spacing <= 0) throw new RangeError("spacing must be a positive finite number");
	const side = count === 0 ? 0 : Math.ceil(Math.cbrt(count));
	const totalCount = count;
	const positions = new Float32Array(count * 3);
	const neuronIndex = new Float32Array(count);
	const half = (side - 1) / 2;
	if (side > 1 && spacing > FLOAT32_MAX / half) throw new RangeError("spacing would overflow Float32 neuron positions");
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
			if (!Number.isFinite(positions[i * 3]) || !Number.isFinite(positions[i * 3 + 1]) || !Number.isFinite(positions[i * 3 + 2])) throw new RangeError("neuron positions exceed the finite Float32 range");
		}
	}
	return {
		positions,
		neuronIndex,
		side,
		totalCount
	};
}
function ExpandableNeurons({ count, center = [
	0,
	0,
	0
], color, spikeColor, expanded, themeMode, reducedMotion = false, spacing = .4, selectedNeuronIndex = null, membraneIntensity, spikeIntensity, onHoverNeuron, onSelectNeuron }) {
	if (!Array.isArray(center) || center.length !== 3 || center.some((value) => !Number.isFinite(value) || Math.abs(value) > FLOAT32_MAX)) throw new RangeError("center must be an exact finite Float32-range xyz tuple");
	if (selectedNeuronIndex !== null && (!Number.isSafeInteger(selectedNeuronIndex) || selectedNeuronIndex < 0 || selectedNeuronIndex >= count)) throw new RangeError("selectedNeuronIndex must reference a rendered neuron");
	if ((onHoverNeuron !== void 0 || onSelectNeuron !== void 0) && count > 25e3) throw new RangeError(`interactive point picking is limited to ${MAX_INTERACTIVE_NEURON_POINTS} neurons; omit callbacks or use indexed/GPU picking`);
	const grid = useMemo(() => neuronLocalGrid(count, spacing), [count, spacing]);
	const activity = useMemo(() => {
		for (const [label, values] of [["membraneIntensity", membraneIntensity], ["spikeIntensity", spikeIntensity]]) if (values !== void 0 && values.length !== count) throw new RangeError(`${label} length (${values.length}) must match count (${count})`);
		const packed = new Float32Array(count * 2);
		for (let i = 0; i < count; i++) {
			const membrane = membraneIntensity?.[i] ?? 0;
			const spike = spikeIntensity?.[i] ?? 0;
			if (!Number.isFinite(membrane) || membrane < 0 || membrane > 1 || !Number.isFinite(spike) || spike < 0 || spike > 1) throw new RangeError(`neuron activity at index ${i} must contain finite values in [0, 1]`);
			packed[i * 2] = membrane;
			packed[i * 2 + 1] = spike;
		}
		return packed;
	}, [
		count,
		membraneIntensity,
		spikeIntensity
	]);
	const pointsRef = useRef(null);
	const previousExpandedRef = useRef(expanded);
	const onHoverRef = useRef(onHoverNeuron);
	useEffect(() => {
		onHoverRef.current = onHoverNeuron;
	}, [onHoverNeuron]);
	useEffect(() => () => onHoverRef.current?.(null), []);
	useEffect(() => {
		if (previousExpandedRef.current && !expanded) onHoverNeuron?.(null);
		previousExpandedRef.current = expanded;
	}, [expanded, onHoverNeuron]);
	const geometry = useMemo(() => {
		const g = new THREE.BufferGeometry();
		g.setAttribute("position", new THREE.BufferAttribute(grid.positions, 3));
		g.setAttribute("neuronIndex", new THREE.BufferAttribute(grid.neuronIndex, 1));
		g.setAttribute("neuronActivity", new THREE.BufferAttribute(activity, 2));
		return g;
	}, [grid, activity]);
	useEffect(() => () => geometry.dispose(), [geometry]);
	const resolvedSpike = spikeColor ?? (themeMode === "light" ? "#b45309" : "#fde68a");
	const material = useMemo(() => {
		return new THREE.ShaderMaterial({
			vertexShader: NEURON_VERT,
			fragmentShader: NEURON_FRAG,
			uniforms: {
				uExpansion: { value: 0 },
				uSelectedNeuronIndex: { value: -1 },
				uRevealCount: { value: grid.totalCount },
				uOpacity: { value: 0 },
				uBaseColor: { value: new THREE.Color(color) },
				uSpikeColor: { value: new THREE.Color(resolvedSpike) }
			},
			transparent: true,
			depthWrite: false,
			blending: THREE.NormalBlending
		});
	}, [color, resolvedSpike]);
	useEffect(() => () => material.dispose(), [material]);
	const initiallyExpanded = expanded && reducedMotion;
	const expansionRef = useRef(initiallyExpanded ? 1 : 0);
	const opacityRef = useRef(initiallyExpanded ? 1 : 0);
	useLayoutEffect(() => {
		pointsRef.current?.scale.setScalar(neuronExpandedScale(expansionRef.current));
		material.uniforms.uExpansion.value = expansionRef.current;
		material.uniforms.uOpacity.value = opacityRef.current;
		material.uniforms.uSelectedNeuronIndex.value = selectedNeuronIndex === null ? -1 : selectedNeuronIndex;
	}, [
		geometry,
		material,
		selectedNeuronIndex
	]);
	useFrame((state, delta) => {
		const lerp = reducedMotion ? 1 : 1 - Math.exp(-9.75 * Math.min(delta, .1));
		const target = expanded ? 1 : 0;
		expansionRef.current += (target - expansionRef.current) * lerp;
		opacityRef.current += (target - opacityRef.current) * lerp;
		const u = material.uniforms;
		u.uExpansion.value = expansionRef.current;
		u.uSelectedNeuronIndex.value = selectedNeuronIndex === null ? -1 : selectedNeuronIndex;
		u.uRevealCount.value = grid.totalCount;
		u.uOpacity.value = opacityRef.current;
		pointsRef.current?.scale.setScalar(neuronExpandedScale(expansionRef.current));
		if (!reducedMotion && (Math.abs(target - expansionRef.current) > .001 || Math.abs(target - opacityRef.current) > .001)) state.invalidate();
	});
	return /* @__PURE__ */ jsx("points", {
		ref: pointsRef,
		geometry,
		material,
		position: center,
		...onHoverNeuron ? {
			onPointerOver: (e) => {
				if (expansionRef.current < .98) return;
				e.stopPropagation();
				if (e.index !== void 0) onHoverNeuron(e.index);
			},
			onPointerOut: () => onHoverNeuron(null)
		} : {},
		...onSelectNeuron ? { onClick: (e) => {
			if (expansionRef.current < .98) return;
			e.stopPropagation();
			if (e.index !== void 0) onSelectNeuron(e.index);
		} } : {}
	});
}

//#endregion
//#region react/SelectionA11yControls.tsx
function PopulationA11yList({ populations, selectedId, onSelect, label = "Neural populations" }) {
	return /* @__PURE__ */ jsx("section", {
		"aria-label": safeDiagnosticText(label, 240),
		children: populations.length === 0 ? /* @__PURE__ */ jsx("p", {
			role: "status",
			children: "No populations are available."
		}) : /* @__PURE__ */ jsx("ul", { children: populations.map((population) => /* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsx("button", {
			type: "button",
			disabled: population.disabled,
			"aria-pressed": selectedId === population.id,
			onClick: () => onSelect(population.id),
			style: {
				minWidth: 44,
				minHeight: 44
			},
			children: safeDiagnosticText(population.label, 240)
		}), population.description && /* @__PURE__ */ jsxs("span", { children: [" ", safeDiagnosticText(population.description, 500)] })] }, population.id)) })
	});
}
const DEFAULT_NEURON_A11Y_PAGE_SIZE = 50;
const MAX_NEURON_A11Y_PAGE_SIZE = 200;
function NeuronA11yPager({ count, selectedIndex, onSelect, pageSize = 50, getLabel = (index) => `Neuron ${index + 1}`, label = "Neurons" }) {
	if (!Number.isSafeInteger(count) || count < 0 || count > 1e6) throw new RangeError(`count must be a non-negative safe integer <= ${MAX_NEURON_POINTS}`);
	if (selectedIndex !== null && (!Number.isSafeInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= count)) throw new RangeError("selectedIndex must reference an available neuron");
	const safePageSize = Number.isSafeInteger(pageSize) ? Math.min(200, Math.max(1, pageSize)) : 50;
	const pageCount = Math.max(1, Math.ceil(count / safePageSize));
	const [page, setPage] = useState(selectedIndex === null ? 0 : Math.floor(selectedIndex / safePageSize));
	const currentPage = Math.min(page, pageCount - 1);
	useEffect(() => {
		if (selectedIndex !== null) setPage(Math.floor(selectedIndex / safePageSize));
		else setPage((value) => Math.min(value, pageCount - 1));
	}, [
		selectedIndex,
		safePageSize,
		pageCount
	]);
	const start = currentPage * safePageSize;
	const end = Math.min(count, start + safePageSize);
	return /* @__PURE__ */ jsx("section", {
		"aria-label": safeDiagnosticText(label, 240),
		children: count === 0 ? /* @__PURE__ */ jsx("p", {
			role: "status",
			children: "No neurons are available."
		}) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("ul", { children: Array.from({ length: end - start }, (_, offset) => start + offset).map((index) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("button", {
			type: "button",
			"aria-pressed": selectedIndex === index,
			onClick: () => onSelect(index),
			style: {
				minWidth: 44,
				minHeight: 44
			},
			children: safeDiagnosticText(getLabel(index), 240)
		}) }, index)) }), pageCount > 1 && /* @__PURE__ */ jsxs("nav", {
			"aria-label": "Neuron pages",
			children: [
				/* @__PURE__ */ jsxs("p", {
					"aria-live": "polite",
					children: [
						"Neuron page ",
						currentPage + 1,
						" of ",
						pageCount
					]
				}),
				/* @__PURE__ */ jsx("button", {
					type: "button",
					disabled: currentPage === 0,
					onClick: () => setPage((value) => Math.max(0, value - 1)),
					style: {
						minWidth: 44,
						minHeight: 44
					},
					children: "Previous neurons"
				}),
				/* @__PURE__ */ jsx("button", {
					type: "button",
					disabled: currentPage + 1 >= pageCount,
					onClick: () => setPage((value) => Math.min(pageCount - 1, value + 1)),
					style: {
						minWidth: 44,
						minHeight: 44
					},
					children: "Next neurons"
				})
			]
		})] })
	});
}

//#endregion
export { DEFAULT_NEURON_A11Y_PAGE_SIZE, ExpandableNeurons, ExpandablePopulation, MAX_INTERACTIVE_NEURON_POINTS, MAX_NEURON_A11Y_PAGE_SIZE, MAX_NEURON_POINTS, MAX_POPULATION_SIZE, NEURON_CLUSTER_SCALE, NEURON_FRAG, NEURON_VERT, NeuronA11yPager, PopulationA11yList, VizSpecRenderer, neuronExpandedScale, neuronLocalGrid, usePopulationExpand, validatePopulationGeometry };
//# sourceMappingURL=index.js.map