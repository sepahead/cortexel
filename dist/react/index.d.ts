import * as react from 'react';
import { ReactNode } from 'react';
import * as THREE from 'three';
import { q as SceneName, r as SemanticPalette } from '../designLaws-DmE67pkk.js';

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
/** World scale factor for a neuron's local offset at a given expansion (0..1).
 *  Matches the shader's `mix(0.06, 1.0, uExpansion)`. */
declare function neuronExpandedScale(expansion: number): number;
interface NeuronGrid {
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
    onHoverNeuron?: (index: number | null) => void;
    onSelectNeuron?: (index: number | null) => void;
}
declare function ExpandableNeurons({ count, center, color, spikeColor, expanded, themeMode, reducedMotion, spacing, selectedNeuronIndex, onHoverNeuron, onSelectNeuron, }: ExpandableNeuronsProps): react.JSX.Element;

declare const NEURON_VERT = "\nattribute float instancePhase;\nattribute float neuronIndex;\n\nuniform float uTime;\nuniform float uExpansion;\nuniform float uSelectedNeuronIndex;\nuniform vec3 uCenter;\n\nvarying float vMembranePotential;\nvarying float vSpikeIntensity;\nvarying float vIsSelected;\n\nvoid main() {\n  // Sub-threshold membrane oscillation, phase-offset per neuron.\n  float oscillation = sin(uTime * 2.0 + instancePhase) * 0.5 + 0.5;\n  vMembranePotential = oscillation;\n\n  // Sparse, cheap \"spike\": the top of each neuron's own oscillation pops bright.\n  // Schematic liveliness only \u2014 not measured spiking.\n  vSpikeIntensity = smoothstep(0.93, 1.0, oscillation);\n\n  vIsSelected = abs(neuronIndex - uSelectedNeuronIndex) < 0.1 ? 1.0 : 0.0;\n\n  // Progressive reveal: a small core shows first, outer rows fade in with uExpansion.\n  if (neuronIndex > 50.0) {\n    float rowThreshold = (neuronIndex - 50.0) / 1200.0;\n    float visibility = smoothstep(rowThreshold - 0.06, rowThreshold + 0.06, uExpansion);\n    if (visibility <= 0.01) {\n      gl_Position = vec4(0.0);\n      return;\n    }\n  }\n\n  // Cluster tightly at the hub centre when collapsed; spread to the full grid as\n  // uExpansion goes to 1. The position attribute is the centered local grid offset.\n  float scale = mix(0.06, 1.0, uExpansion);\n  vec3 pos = uCenter + position * scale;\n\n  float size = mix(1.0, 1.8, uExpansion);\n  if (vIsSelected > 0.5) size = 6.5;\n\n  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);\n  gl_PointSize = size * (300.0 / -mvPosition.z);\n  gl_Position = projectionMatrix * mvPosition;\n}\n";
declare const NEURON_FRAG = "\nvarying float vMembranePotential;\nvarying float vSpikeIntensity;\nvarying float vIsSelected;\n\nuniform vec3 uBaseColor;\nuniform vec3 uSpikeColor;\n\nvoid main() {\n  vec2 center = gl_PointCoord - 0.5;\n  float dist = length(center);\n  if (dist > 0.5) discard;\n\n  // Reconstruct the sphere normal across the point sprite.\n  vec3 normal = vec3(center * 2.0, 0.0);\n  normal.z = sqrt(max(0.0, 1.0 - dot(normal.xy, normal.xy)));\n  normal = normalize(normal);\n\n  vec3 lightDir = normalize(vec3(0.4, 0.6, 0.9));\n  float diffuse = max(0.30, dot(normal, lightDir));\n  vec3 baseColor = uBaseColor * diffuse * (0.72 + 0.28 * vMembranePotential);\n\n  float fresnel = pow(1.0 - normal.z, 2.5);\n  vec3 rim = uBaseColor * fresnel * (0.9 + 0.6 * vMembranePotential);\n\n  float coreGlow = smoothstep(0.5, 0.0, dist);\n  vec3 emissive = uBaseColor * coreGlow * (0.35 + 0.55 * vMembranePotential);\n\n  vec3 color = baseColor + rim + emissive;\n\n  // Spike flash \u2014 coloured bloom, capped ~1.15 luminance to stay under the\n  // bloom bleach budget (design law).\n  if (vSpikeIntensity > 0.001) {\n    vec3 flash = mix(uSpikeColor, vec3(1.0), 0.35) * (1.10 + 0.05 * vSpikeIntensity);\n    color = mix(color, flash, clamp(vSpikeIntensity * 1.1, 0.0, 1.0));\n  }\n\n  vec3 viewDir = vec3(0.0, 0.0, 1.0);\n  vec3 halfDir = normalize(lightDir + viewDir);\n  float spec = pow(max(0.0, dot(normal, halfDir)), 22.0);\n  color += vec3(0.35) * spec * (1.0 - 0.4 * vSpikeIntensity);\n\n  float alpha = smoothstep(0.5, 0.46, dist);\n\n  // Selected neuron \u2014 gold halo ring.\n  if (vIsSelected > 0.5) {\n    if (dist > 0.40) {\n      float ring = smoothstep(0.40, 0.43, dist);\n      color = mix(color, vec3(1.15, 1.0, 0.36), ring);\n      alpha = 1.0;\n    }\n    color += vec3(0.25, 0.22, 0.05);\n  }\n\n  gl_FragColor = vec4(max(color, vec3(0.0)), alpha);\n}\n";

interface KnowledgeGraph3DNode {
    id: string;
    label: string;
    color: string;
    radius: number;
    kind: string;
}
interface KnowledgeGraph3DEdge {
    source: string;
    target: string;
    color: string;
    directed: boolean;
    kind: string;
    /** Animate glowing particles flowing source→target (e.g. citations). */
    particles?: boolean;
}
/** Minimal OrbitControls surface the scene needs for auto-frame + fly-to. The
 *  controls themselves stay host-side (Design Law #5); the host passes a ref. */
interface ControlsHandle {
    target: THREE.Vector3;
    update: () => void;
}
interface KnowledgeGraph3DSceneProps {
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
declare function KnowledgeGraph3DScene({ nodes, edges, selectedId, query, onSelect, hoverId, onHover, controlsRef, labelColor, }: KnowledgeGraph3DSceneProps): react.JSX.Element;

type CameraHint = 'default' | 'top' | 'side' | 'close' | 'cinematic';
interface RenderSceneArgs {
    scene: SceneName;
    themeMode: 'dark' | 'light';
    active: boolean;
    /** Requested camera framing from the spec (undefined → host default). */
    camera?: CameraHint;
    /** Resolved semantic palette — the active render policy. When the spec
     *  includes a palette hint, it is resolved here; otherwise the host's
     *  active palette (or the Cortexel default) is passed. Scene components
     *  should consume colors from this, not from module-level imports. */
    palette: SemanticPalette;
}
interface VizSpecRendererProps {
    /** Untrusted spec (e.g. an agent payload). Validated before rendering. */
    spec: unknown;
    /** Host-injected scene renderer. Keeps Cortexel free of app dependencies. */
    renderScene: (args: RenderSceneArgs) => ReactNode;
    /** When set, the spec is validated through the strict skill gate
     *  (validateSkillInvocation): per-skill params + declared provenance keys are
     *  enforced, calibrated_posterior=true is rejected, and the honesty caption is
     *  bound at this render boundary. Prefer this for agent payloads. */
    skillId?: string;
    active?: boolean;
    /** The host's active palette — used when the spec does not include a palette
     *  hint. Defaults to the Cortexel default ('crameri'). The resolved palette
     *  (spec hint or host active) is passed to renderScene via RenderSceneArgs. */
    activePalette?: SemanticPalette;
    onError?: (errors: string[]) => void;
}
declare function VizSpecRenderer({ spec, renderScene, skillId, active, activePalette, onError, }: VizSpecRendererProps): react.JSX.Element;

export { type CameraHint, type ControlsHandle, ExpandableNeurons, type ExpandableNeuronsProps, ExpandablePopulation, type ExpandablePopulationProps, type KnowledgeGraph3DEdge, type KnowledgeGraph3DNode, KnowledgeGraph3DScene, type KnowledgeGraph3DSceneProps, NEURON_CLUSTER_SCALE, NEURON_FRAG, NEURON_VERT, type NeuronGrid, type PopulationExpand, type PopulationExpandController, type RenderSceneArgs, VizSpecRenderer, type VizSpecRendererProps, neuronExpandedScale, neuronLocalGrid, usePopulationExpand };
