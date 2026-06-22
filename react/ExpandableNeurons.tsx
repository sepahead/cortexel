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
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { NEURON_FRAG, NEURON_VERT } from './neuronShaders';

/** Cluster scale at full collapse (uExpansion=0). Mirrors the vertex shader. */
export const NEURON_CLUSTER_SCALE = 0.06;

/** World scale factor for a neuron's local offset at a given expansion (0..1).
 *  Matches the shader's `mix(0.06, 1.0, uExpansion)`. */
export function neuronExpandedScale(expansion: number): number {
  return NEURON_CLUSTER_SCALE + (1.0 - NEURON_CLUSTER_SCALE) * expansion;
}

export interface NeuronGrid {
  /** Centered local grid offsets (xyz per neuron), spacing baked in. */
  positions: Float32Array;
  phases: Float32Array;
  neuronIndex: Float32Array;
  side: number;
  totalCount: number;
}

/** Build a centered 3D cubic grid for `count` neurons. The grid is padded up to
 *  a perfect cube so it fills space evenly in x/y/z. Deterministic phases (no
 *  Math.random — keeps Cortexel resume-safe and the layout stable). */
export function neuronLocalGrid(count: number, spacing = 0.4): NeuronGrid {
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
    // Deterministic phase spread from the index (golden-angle hash).
    phases[i] = (i * 2.399963) % (Math.PI * 2);
    neuronIndex[i] = i;
  }
  return { positions, phases, neuronIndex, side, totalCount };
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
  onHoverNeuron,
  onSelectNeuron,
}: ExpandableNeuronsProps) {
  const grid = useMemo(() => neuronLocalGrid(count, spacing), [count, spacing]);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(grid.positions, 3));
    g.setAttribute('instancePhase', new THREE.BufferAttribute(grid.phases, 1));
    g.setAttribute('neuronIndex', new THREE.BufferAttribute(grid.neuronIndex, 1));
    return g;
  }, [grid]);

  const resolvedSpike = spikeColor ?? (themeMode === 'light' ? '#b45309' : '#fde68a');
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: NEURON_VERT,
      fragmentShader: NEURON_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uExpansion: { value: 0 },
        uSelectedNeuronIndex: { value: -1 },
        uCenter: { value: new THREE.Vector3(center[0], center[1], center[2]) },
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

  const timeRef = useRef(0);
  const expansionRef = useRef(0);
  const opacityRef = useRef(0);

  useFrame((_, delta) => {
    if (!reducedMotion) timeRef.current += delta;
    const lerp = reducedMotion ? 1.0 : 0.15;

    const target = expanded ? 1.0 : 0.0;
    expansionRef.current += (target - expansionRef.current) * lerp;
    opacityRef.current += (target - opacityRef.current) * lerp;

    const u = material.uniforms;
    u.uTime.value = timeRef.current;
    u.uExpansion.value = expansionRef.current;
    u.uSelectedNeuronIndex.value =
      selectedNeuronIndex === null ? -1 : selectedNeuronIndex;
    // Mutate the existing Vector3 in place (no per-frame allocation).
    (u.uCenter.value as THREE.Vector3).set(center[0], center[1], center[2]);
    material.opacity = opacityRef.current;
  });

  const interactive = expanded;

  return (
    <points
      geometry={geometry}
      material={material}
      onPointerOver={(e) => {
        if (!interactive || !onHoverNeuron) return;
        e.stopPropagation();
        if (e.index !== undefined) onHoverNeuron(e.index);
      }}
      onPointerOut={() => {
        if (!interactive || !onHoverNeuron) return;
        onHoverNeuron(null);
      }}
      onClick={(e) => {
        if (!interactive || !onSelectNeuron) return;
        e.stopPropagation();
        if (e.index !== undefined) onSelectNeuron(e.index);
      }}
    />
  );
}
