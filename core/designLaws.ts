export type NeuralSceneMode = 'hero' | 'background' | 'standalone';

// Single source of truth for the closed set of Cortexel scenes. The TS union
// `SceneName` and the runtime Zod enum (core/vizSpec.ts) both derive from this
// tuple, so they can never drift.
export const SCENE_NAMES = Object.freeze([
  'live-activity',
  'cortical-column',
  'stdp',
  'spike-raster',
  'network-topology',
  'voltage-trace',
  'phase-plane',
  'brunel-network',
  'fi-curve',
  'isi-distribution',
  'psth',
  'weight-histogram',
  'knowledge-graph-3d',
] as const);

export type SceneName = (typeof SCENE_NAMES)[number];

export interface NeuralSceneHandle {
  nextScene: () => void;
  setScene: (scene: SceneName) => void;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setCameraPreset: (preset: CameraPresetName) => void;
}

export interface NeuralSceneProps {
  mode: NeuralSceneMode;
  scene?: SceneName | 'auto';
  opacity?: number;
  cycleInterval?: number;
  themeMode?: 'dark' | 'light';
  /**
   * When false, the WebGL frameloop is suspended (`frameloop="never"`) so a
   * scene hidden behind another tab stops burning GPU/bloom every frame. The
   * last frame stays painted; flipping back to true resumes rendering. Defaults
   * to true so existing call sites are unchanged.
   */
  active?: boolean;
}

export interface LayerConfig {
  layer: string;
  y: number;
  count: number;
  color: string;
  label: string;
}

export interface STDPSynapse {
  preIdx: number;
  postIdx: number;
  weight: number;
  targetWeight: number;
  lastPreSpike: number;
  lastPostSpike: number;
}

export type CameraPresetName =
  | 'default'
  | 'top'
  | 'side'
  | 'close'
  | 'cinematic';

export interface CameraPreset {
  name: CameraPresetName;
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  speed: number;
}

export interface SceneData {
  // Time axes stay float64: long simulations can differ by sub-ms increments
  // that collapse when absolute timestamps are narrowed to Float32.
  spikeTimes?: Float64Array;
  spikeSenders?: Float32Array;
  timeUnits?: string;
  voltageTraces?: Float32Array;
  voltageUnits?: string;
  traceTimes?: Float64Array;
  traceSender?: number;
  // Synaptic weight time-series (plasticity / weight_recorder). Kept distinct
  // from voltageTraces so a renderer never mislabels weights as membrane voltage
  // and weight_units provenance is not lost at the SceneData boundary.
  weightSeries?: Float32Array;
  weightUnits?: string;
  weightSynapse?: { sender: number; target: number };
  // Non-voltage analog recordings (e.g. astrocyte Ca²⁺/IP₃) that share the
  // analog-trace scene but are NOT membrane voltage. Self-labeling so the
  // renderer never presents Ca/IP3 as mV — the same separation as weightSeries.
  analogTraces?: { values: Float32Array; variable: string; units: string };
  /** Connectivity dumps do not contain coordinates; absent x/y/z means the
   *  renderer may derive a disclosed layout but must not present it as data. */
  networkNodes?: {
    id: number;
    x?: number;
    y?: number;
    z?: number;
    label: string;
  }[];
  networkEdges?: {
    source: number;
    target: number;
    weight?: number;
    delay?: number;
  }[];
  /** Present whenever networkEdges carry the corresponding measurement. */
  networkWeightUnits?: string;
  networkDelayUnits?: string;
  /** Units for provided network x/y/z coordinates (never inferred). */
  networkCoordinateUnits?: string;
  networkLayout?: 'unpositioned' | 'provided-2d' | 'provided-3d';
  vectorField?: { x: number; y: number; z: number; dx: number; dy: number; dz: number }[];
}

// Per-scene camera framing: fills the frame for each scene's native scale and
// declares whether the scene is a spatial 3D circuit (orbit/auto-rotate) or a
// 2D analysis chart (read head-on, no rotation). The single fixed [0,0,8]
// frustum was the #1 cause of the sparse / dead-space look.
export interface SceneFraming {
  position: [number, number, number];
  target: [number, number, number];
  rotatable: boolean; // 3D circuit → orbit + auto-rotate; chart → locked head-on
}

export const SCENE_FRAMING: Record<SceneName, SceneFraming> = {
  'live-activity':    { position: [0, 0, 9.4],      target: [0, 0, 0],     rotatable: false },
  'cortical-column':  { position: [3.4, 0.4, 10.6], target: [0.4, 0, 0],   rotatable: true },
  'stdp':             { position: [0, 0.2, 6.8],    target: [0, 0, 0],     rotatable: true },
  'network-topology': { position: [4.6, 2.0, 9.2],  target: [0, 0, 0],     rotatable: true },
  'brunel-network':   { position: [0, 1.1, 9.4],    target: [0, 0.2, 0],   rotatable: true },
  'spike-raster':     { position: [0, 0, 8.0],      target: [0, 0, 0],     rotatable: false },
  'voltage-trace':    { position: [0, 0, 8.2],      target: [0, 0, 0],     rotatable: false },
  'phase-plane':      { position: [0, 0, 7.8],      target: [0, 0, 0],     rotatable: false },
  'fi-curve':         { position: [0, 0.7, 6.4],    target: [0, 0.7, 0],   rotatable: false },
  'isi-distribution': { position: [0, 0.6, 7.4],    target: [0, 0.6, 0],   rotatable: false },
  'psth':             { position: [0, 0.6, 7.4],    target: [0, 0.6, 0],   rotatable: false },
  'weight-histogram': { position: [0, 0.6, 7.4],    target: [0, 0.6, 0],   rotatable: false },
  'knowledge-graph-3d': { position: [0, 0, 260],    target: [0, 0, 0],     rotatable: true },
};

export const CAMERA_PRESETS: Record<CameraPresetName, CameraPreset> = {
  default: { name: 'default', position: [0, 0, 8], target: [0, 0, 0], fov: 50 },
  top: { name: 'top', position: [0, 12, 0], target: [0, 0, 0], fov: 45 },
  side: { name: 'side', position: [12, 0, 0], target: [0, 0, 0], fov: 45 },
  close: { name: 'close', position: [0, 2, 4], target: [0, 0, 0], fov: 35 },
  cinematic: { name: 'cinematic', position: [6, 4, 6], target: [0, 0, 0], fov: 40 },
};
