// ExpandableNeurons — the canonical Cortexel point-neuron cloud.
//
// The companion to ExpandablePopulation: a population voxel hub collapses and
// THIS reveals its constituent neurons as ray-cast sphere points, clustered at
// the hub centre and blooming out to a 3D grid as it expands. Single neuron =
// sphere (design law). useFrame is allocation-free (uniforms mutated in place).
//
// The grid layout is exported (`neuronLocalGrid`, `neuronClusterScale`) so an
// owning scene can place synapses on the exact same neuron positions without
// duplicating the morph math.

import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { NEURON_FRAG, NEURON_VERT } from './neuronShaders';

/** Cluster scale at full collapse (uExpansion=0). Mirrors the vertex shader. */
export const NEURON_CLUSTER_SCALE = 0.06;
export const MAX_NEURON_POINTS = 1_000_000;
export const MAX_INTERACTIVE_NEURON_POINTS = 25_000;
const FLOAT32_MAX = 3.4028234663852886e38;

/** World scale factor for a neuron's local offset at a given expansion (0..1).
 *  Matches the shader's `mix(0.06, 1.0, uExpansion)`. */
export function neuronExpandedScale(expansion: number): number {
  if (!Number.isFinite(expansion)) {
    throw new RangeError('expansion must be a finite number');
  }
  const t = Math.min(1, Math.max(0, expansion));
  return NEURON_CLUSTER_SCALE + (1.0 - NEURON_CLUSTER_SCALE) * t;
}

export interface NeuronGrid {
  /** Centered local grid offsets (xyz per neuron), spacing baked in. */
  positions: Float32Array;
  neuronIndex: Float32Array;
  side: number;
  totalCount: number;
}

/** Build a centered 3D cubic layout for exactly `count` neurons. The enclosing
 *  side length is cubic, but unused tail cells are never allocated or rendered:
 *  Cortexel must not invent neurons merely to fill a perfect cube. */
export function neuronLocalGrid(count: number, spacing = 0.4): NeuronGrid {
  if (!Number.isSafeInteger(count) || count < 0 || count > MAX_NEURON_POINTS) {
    throw new RangeError(
      `count must be a non-negative safe integer <= ${MAX_NEURON_POINTS}`,
    );
  }
  if (!Number.isFinite(spacing) || spacing <= 0) {
    throw new RangeError('spacing must be a positive finite number');
  }
  const side = count === 0 ? 0 : Math.ceil(Math.cbrt(count));
  const totalCount = count;
  const positions = new Float32Array(count * 3);
  const neuronIndex = new Float32Array(count);
  const half = (side - 1) / 2;
  if (side > 1 && spacing > FLOAT32_MAX / half) {
    throw new RangeError('spacing would overflow Float32 neuron positions');
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
  // Truncating the final cube row otherwise shifts non-perfect-cube counts away
  // from the population center (e.g. count=9 lies entirely on one z plane).
  if (totalCount > 0) {
    const meanX = sumX / totalCount;
    const meanY = sumY / totalCount;
    const meanZ = sumZ / totalCount;
    for (let i = 0; i < totalCount; i++) {
      positions[i * 3] -= meanX;
      positions[i * 3 + 1] -= meanY;
      positions[i * 3 + 2] -= meanZ;
      if (
        !Number.isFinite(positions[i * 3]) ||
        !Number.isFinite(positions[i * 3 + 1]) ||
        !Number.isFinite(positions[i * 3 + 2])
      ) {
        throw new RangeError('neuron positions exceed the finite Float32 range');
      }
    }
  }
  return { positions, neuronIndex, side, totalCount };
}

export interface ExpandableNeuronsProps {
  count: number;
  center?: [number, number, number];
  color: string;
  /** Spike-flash colour; defaults to a theme-appropriate warm tone. */
  spikeColor?: string;
  /** Drives the cluster→grid reveal. */
  expanded: boolean;
  themeMode: 'dark' | 'light';
  reducedMotion?: boolean;
  spacing?: number;
  selectedNeuronIndex?: number | null;
  /** Optional normalized measured/derived snapshot, one finite value in [0,1]
   *  per neuron. Omitted values render statically at zero; Cortexel never
   *  fabricates membrane activity for visual liveliness. */
  membraneIntensity?: ArrayLike<number>;
  /** Optional normalized spike intensity, one finite value in [0,1] per neuron.
   *  The caller/provenance owns whether this is measured, derived, or schematic. */
  spikeIntensity?: ArrayLike<number>;
  onHoverNeuron?: (index: number | null) => void;
  onSelectNeuron?: (index: number | null) => void;
}

export function ExpandableNeurons({
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
  onSelectNeuron,
}: ExpandableNeuronsProps) {
  if (
    !Array.isArray(center) ||
    center.length !== 3 ||
    center.some((value) => !Number.isFinite(value) || Math.abs(value) > FLOAT32_MAX)
  ) {
    throw new RangeError('center must be an exact finite Float32-range xyz tuple');
  }
  if (
    selectedNeuronIndex !== null &&
    (!Number.isSafeInteger(selectedNeuronIndex) ||
      selectedNeuronIndex < 0 ||
      selectedNeuronIndex >= count)
  ) {
    throw new RangeError('selectedNeuronIndex must reference a rendered neuron');
  }
  const interactive = onHoverNeuron !== undefined || onSelectNeuron !== undefined;
  if (interactive && count > MAX_INTERACTIVE_NEURON_POINTS) {
    throw new RangeError(
      `interactive point picking is limited to ${MAX_INTERACTIVE_NEURON_POINTS} neurons; omit callbacks or use indexed/GPU picking`,
    );
  }
  const grid = useMemo(() => neuronLocalGrid(count, spacing), [count, spacing]);
  const activity = useMemo(() => {
    for (const [label, values] of [
      ['membraneIntensity', membraneIntensity],
      ['spikeIntensity', spikeIntensity],
    ] as const) {
      if (values !== undefined && values.length !== count) {
        throw new RangeError(`${label} length (${values.length}) must match count (${count})`);
      }
    }
    const packed = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const membrane = membraneIntensity?.[i] ?? 0;
      const spike = spikeIntensity?.[i] ?? 0;
      if (
        !Number.isFinite(membrane) ||
        membrane < 0 ||
        membrane > 1 ||
        !Number.isFinite(spike) ||
        spike < 0 ||
        spike > 1
      ) {
        throw new RangeError(
          `neuron activity at index ${i} must contain finite values in [0, 1]`,
        );
      }
      packed[i * 2] = membrane;
      packed[i * 2 + 1] = spike;
    }
    return packed;
  }, [count, membraneIntensity, spikeIntensity]);
  const pointsRef = useRef<THREE.Points>(null);
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
    g.setAttribute('position', new THREE.BufferAttribute(grid.positions, 3));
    g.setAttribute('neuronIndex', new THREE.BufferAttribute(grid.neuronIndex, 1));
    g.setAttribute('neuronActivity', new THREE.BufferAttribute(activity, 2));
    return g;
  }, [grid, activity]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const resolvedSpike = spikeColor ?? (themeMode === 'light' ? '#b45309' : '#fde68a');
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
        uSpikeColor: { value: new THREE.Color(resolvedSpike) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    // center handled via a separate effect-free uniform write below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color, resolvedSpike]);
  useEffect(() => () => material.dispose(), [material]);

  const initiallyExpanded = expanded && reducedMotion;
  const expansionRef = useRef(initiallyExpanded ? 1 : 0);
  const opacityRef = useRef(initiallyExpanded ? 1 : 0);

  useLayoutEffect(() => {
    pointsRef.current?.scale.setScalar(neuronExpandedScale(expansionRef.current));
    material.uniforms.uExpansion.value = expansionRef.current;
    material.uniforms.uOpacity.value = opacityRef.current;
    material.uniforms.uSelectedNeuronIndex.value =
      selectedNeuronIndex === null ? -1 : selectedNeuronIndex;
  }, [geometry, material, selectedNeuronIndex]);

  useFrame((state, delta) => {
    const lerp = reducedMotion
      ? 1.0
      : 1 - Math.exp(-9.75 * Math.min(delta, 0.1));

    const target = expanded ? 1.0 : 0.0;
    expansionRef.current += (target - expansionRef.current) * lerp;
    opacityRef.current += (target - opacityRef.current) * lerp;

    const u = material.uniforms;
    u.uExpansion.value = expansionRef.current;
    u.uSelectedNeuronIndex.value =
      selectedNeuronIndex === null ? -1 : selectedNeuronIndex;
    // Normalizes the vertex-shader reveal ramp to the real count (kept fresh here
    // so a changed `count` never clips outer neurons).
    u.uRevealCount.value = grid.totalCount;
    // Drive the fade through the uOpacity uniform the fragment shader consumes
    // (material.opacity is a no-op on a raw ShaderMaterial).
    u.uOpacity.value = opacityRef.current;
    pointsRef.current?.scale.setScalar(neuronExpandedScale(expansionRef.current));
    if (
      !reducedMotion &&
      (Math.abs(target - expansionRef.current) > 0.001 ||
        Math.abs(target - opacityRef.current) > 0.001)
    ) {
      state.invalidate();
    }
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      position={center}
      {...(onHoverNeuron
        ? {
            onPointerOver: (e) => {
              if (expansionRef.current < 0.98) return;
              e.stopPropagation();
              if (e.index !== undefined) onHoverNeuron(e.index);
            },
            onPointerOut: () => onHoverNeuron(null),
          }
        : {})}
      {...(onSelectNeuron
        ? {
            onClick: (e) => {
              if (expansionRef.current < 0.98) return;
              e.stopPropagation();
              if (e.index !== undefined) onSelectNeuron(e.index);
            },
          }
        : {})}
    />
  );
}
