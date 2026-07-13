import * as react from 'react';
export { C as CameraHint, R as RenderSceneArgs, V as VizSpecRenderer, a as VizSpecRendererProps } from '../VizSpecRenderer-C5B3r0tZ.js';
import '../hostInvocation-B4xa-O3Q.js';
import 'zod';
import '../colormaps-CZ6XejJa.js';

interface PopulationExpandController {
    selectedPopId: string | null;
    hoveredPopId: string | null;
    setSelectedPopId: (id: string | null) => void;
    setHoveredPopId: (id: string | null) => void;
}
interface PopulationExpand extends PopulationExpandController {
    isSelected: (id: string) => boolean;
    isHovered: (id: string) => boolean;
    isAnySelected: () => boolean;
    /** Toggle selection: selecting an already-selected id clears it. */
    toggleSelected: (id: string) => void;
    reset: () => void;
}
declare function usePopulationExpand(controlled?: PopulationExpandController): PopulationExpand;

declare const MAX_POPULATION_SIZE = 10000;
declare function validatePopulationGeometry(position: readonly [number, number, number], size: number): void;
interface ExpandablePopulationProps {
    /** Stable population id (used by the owning scene's selection state). */
    id: string;
    position: [number, number, number];
    color: string;
    isSelected: boolean;
    isAnySelected: boolean;
    isHovered: boolean;
    onHover: (hovered: boolean) => void;
    onClick: () => void;
    themeMode: 'dark' | 'light';
    /** Cube edge length (STDP/Cortical hubs use 0.3). */
    size?: number;
    reducedMotion?: boolean;
}
declare function ExpandablePopulation({ position, color, isSelected, isAnySelected, isHovered, onHover, onClick, themeMode, size, reducedMotion, }: ExpandablePopulationProps): react.JSX.Element;

/** Cluster scale at full collapse (uExpansion=0). Mirrors the vertex shader. */
declare const NEURON_CLUSTER_SCALE = 0.06;
declare const MAX_NEURON_POINTS = 1000000;
declare const MAX_INTERACTIVE_NEURON_POINTS = 25000;
/** World scale factor for a neuron's local offset at a given expansion (0..1).
 *  Matches the shader's `mix(0.06, 1.0, uExpansion)`. */
declare function neuronExpandedScale(expansion: number): number;
interface NeuronGrid {
    /** Centered local grid offsets (xyz per neuron), spacing baked in. */
    positions: Float32Array;
    neuronIndex: Float32Array;
    side: number;
    totalCount: number;
}
/** Build a centered 3D cubic layout for exactly `count` neurons. The enclosing
 *  side length is cubic, but unused tail cells are never allocated or rendered:
 *  Cortexel must not invent neurons merely to fill a perfect cube. */
declare function neuronLocalGrid(count: number, spacing?: number): NeuronGrid;
interface ExpandableNeuronsProps {
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
declare function ExpandableNeurons({ count, center, color, spikeColor, expanded, themeMode, reducedMotion, spacing, selectedNeuronIndex, membraneIntensity, spikeIntensity, onHoverNeuron, onSelectNeuron, }: ExpandableNeuronsProps): react.JSX.Element;

interface AccessiblePopulationOption {
    id: string;
    label: string;
    description?: string;
    disabled?: boolean;
}
declare function PopulationA11yList({ populations, selectedId, onSelect, label, }: {
    populations: readonly AccessiblePopulationOption[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    label?: string;
}): react.JSX.Element;
declare const DEFAULT_NEURON_A11Y_PAGE_SIZE = 50;
declare const MAX_NEURON_A11Y_PAGE_SIZE = 200;
declare function NeuronA11yPager({ count, selectedIndex, onSelect, pageSize, getLabel, label, }: {
    count: number;
    selectedIndex: number | null;
    onSelect: (index: number) => void;
    pageSize?: number;
    getLabel?: (index: number) => string;
    label?: string;
}): react.JSX.Element;

declare const NEURON_VERT = "\nattribute float neuronIndex;\nattribute vec2 neuronActivity;\n\nuniform float uExpansion;\nuniform float uSelectedNeuronIndex;\nuniform float uRevealCount;   // total neuron count \u2014 normalizes the reveal ramp\n\nvarying float vMembranePotential;\nvarying float vSpikeIntensity;\nvarying float vIsSelected;\n\nvoid main() {\n  // Caller-supplied normalized activity snapshot. Missing attributes are filled\n  // with zeros by ExpandableNeurons \u2014 never synthesize scientific activity just\n  // to make a measured figure look lively.\n  vMembranePotential = clamp(neuronActivity.x, 0.0, 1.0);\n  vSpikeIntensity = clamp(neuronActivity.y, 0.0, 1.0);\n\n  vIsSelected = abs(neuronIndex - uSelectedNeuronIndex) < 0.1 ? 1.0 : 0.0;\n\n  // Progressive reveal: a small core shows first, outer rows fade in with\n  // uExpansion. The ramp is normalized by the ACTUAL neuron count (uRevealCount),\n  // so the last row always reaches full visibility at uExpansion=1 \u2014 a fixed\n  // divisor would silently clip every neuron past a hard-coded index.\n  if (neuronIndex > 50.0) {\n    float span = max(1.0, uRevealCount - 50.0);\n    float rowThreshold = (neuronIndex - 50.0) / span;\n    float visibility = smoothstep(rowThreshold - 0.06, rowThreshold + 0.06, uExpansion);\n    if (visibility <= 0.01) {\n      gl_PointSize = 0.0;\n      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);\n      return;\n    }\n  }\n\n  // Cluster tightly at the hub centre when collapsed; spread to the full grid as\n  // uExpansion goes to 1. The position attribute is the centered local grid offset.\n  float size = mix(1.0, 1.8, uExpansion);\n  if (vIsSelected > 0.5) size = 6.5;\n\n  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);\n  gl_PointSize = size * (300.0 / -mvPosition.z);\n  gl_Position = projectionMatrix * mvPosition;\n}\n";
declare const NEURON_FRAG = "\nvarying float vMembranePotential;\nvarying float vSpikeIntensity;\nvarying float vIsSelected;\n\nuniform vec3 uBaseColor;\nuniform vec3 uSpikeColor;\nuniform float uOpacity;   // cluster\u2192grid fade-in (custom ShaderMaterial: not auto-applied)\n\nvoid main() {\n  vec2 center = gl_PointCoord - 0.5;\n  float dist = length(center);\n  if (dist > 0.5) discard;\n\n  // Reconstruct the sphere normal across the point sprite.\n  vec3 normal = vec3(center * 2.0, 0.0);\n  normal.z = sqrt(max(0.0, 1.0 - dot(normal.xy, normal.xy)));\n  normal = normalize(normal);\n\n  vec3 lightDir = normalize(vec3(0.4, 0.6, 0.9));\n  float diffuse = max(0.30, dot(normal, lightDir));\n  vec3 baseColor = uBaseColor * diffuse * (0.72 + 0.28 * vMembranePotential);\n\n  float fresnel = pow(1.0 - normal.z, 2.5);\n  vec3 rim = uBaseColor * fresnel * (0.9 + 0.6 * vMembranePotential);\n\n  float coreGlow = 1.0 - smoothstep(0.0, 0.5, dist);\n  vec3 emissive = uBaseColor * coreGlow * (0.35 + 0.55 * vMembranePotential);\n\n  vec3 color = baseColor + rim + emissive;\n\n  // Spike flash \u2014 coloured bloom, capped ~1.15 luminance to stay under the\n  // bloom bleach budget (design law).\n  if (vSpikeIntensity > 0.001) {\n    vec3 flash = mix(uSpikeColor, vec3(1.0), 0.35) * (1.10 + 0.05 * vSpikeIntensity);\n    color = mix(color, flash, clamp(vSpikeIntensity * 1.1, 0.0, 1.0));\n  }\n\n  vec3 viewDir = vec3(0.0, 0.0, 1.0);\n  vec3 halfDir = normalize(lightDir + viewDir);\n  float spec = pow(max(0.0, dot(normal, halfDir)), 22.0);\n  color += vec3(0.35) * spec * (1.0 - 0.4 * vSpikeIntensity);\n\n  float alpha = 1.0 - smoothstep(0.46, 0.5, dist);\n\n  // Selected neuron \u2014 gold halo ring.\n  if (vIsSelected > 0.5) {\n    if (dist > 0.40) {\n      float ring = smoothstep(0.40, 0.43, dist);\n      color = mix(color, vec3(1.15, 1.0, 0.36), ring);\n      alpha = 1.0;\n    }\n    color += vec3(0.25, 0.22, 0.05);\n  }\n\n  // A raw ShaderMaterial does NOT auto-multiply by material.opacity, so the\n  // cluster\u2192grid fade must be applied explicitly here from the uOpacity uniform.\n  float outputCeiling = (vSpikeIntensity > 0.001 || vIsSelected > 0.5) ? 1.15 : 1.0;\n  gl_FragColor = vec4(clamp(color, vec3(0.0), vec3(outputCeiling)), alpha * uOpacity);\n}\n";

export { type AccessiblePopulationOption, DEFAULT_NEURON_A11Y_PAGE_SIZE, ExpandableNeurons, type ExpandableNeuronsProps, ExpandablePopulation, type ExpandablePopulationProps, MAX_INTERACTIVE_NEURON_POINTS, MAX_NEURON_A11Y_PAGE_SIZE, MAX_NEURON_POINTS, MAX_POPULATION_SIZE, NEURON_CLUSTER_SCALE, NEURON_FRAG, NEURON_VERT, NeuronA11yPager, type NeuronGrid, PopulationA11yList, type PopulationExpand, type PopulationExpandController, neuronExpandedScale, neuronLocalGrid, usePopulationExpand, validatePopulationGeometry };
