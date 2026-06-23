type RGB = readonly [number, number, number];
type ColormapName = 'batlow' | 'vik' | 'viridis' | 'magma' | 'inferno' | 'plasma' | 'cividis' | 'turbo';
/** Sample a perceptually-uniform colormap at `t ∈ [0, 1]` → RGB (0–255). */
declare function sampleColormap(name: ColormapName, t: number): RGB;
/** Sample a colormap at `t ∈ [0, 1]` → `#rrggbb`. */
declare function colormapHex(name: ColormapName, t: number): string;
/** Sample a colormap → `rgba(r, g, b, a)` with explicit alpha. */
declare function colormapRgba(name: ColormapName, t: number, alpha?: number): string;
/** A CSS `linear-gradient(...)` spanning a colormap, for legends and bars. */
declare function colormapGradient(name: ColormapName, angle?: number, stops?: number): string;
/** SVG `<stop>` entries for a `<linearGradient>` spanning a colormap. */
declare function colormapSvgStops(name: ColormapName, stops?: number): string;
/** Palette names are open-ended: hosts register arbitrary names at runtime. */
type PaletteName = string;
/** Metadata describing a palette's color-theory properties. */
interface PaletteMetadata {
    /** Human-readable label for UI display. */
    label: string;
    /** Color theory source (e.g. "Crameri 2018", "Okabe & Ito 2008"). */
    source: string;
    /** Whether the E/I and LTP/LTD colors use a diverging scheme (recommended
     *  for signed data). Sequential palettes on signed data invent structure. */
    diverging: boolean;
}
interface SemanticPalette {
    voidNavy: string;
    deepNavy: string;
    panel: string;
    grid: string;
    cyan: string;
    teal: string;
    violet: string;
    amber: string;
    orange: string;
    pink: string;
    membrane: string;
    spike: string;
    spikeHot: string;
    excitatory: string;
    inhibitory: string;
    ltp: string;
    ltd: string;
    ink: string;
    inkDim: string;
    inkFaint: string;
}
/** A registered palette entry: the colors plus metadata. */
interface PaletteEntry {
    palette: SemanticPalette;
    metadata: PaletteMetadata;
}
/** Default palette — Crameri scientific colour maps (batlow + vik). */
declare const CORTEXEL_PALETTE: SemanticPalette;
/** Validate a palette's hex values and E/I distinctness. Throws on invalid. */
declare function validatePalette(p: SemanticPalette): void;
/** Register a palette at runtime. Hosts call this at app startup to add their
 *  color identities. Validates hex format and E/I distinctness. Throws on
 *  invalid input. Overwriting an existing name is allowed (for hot-reload). */
declare function registerPalette(name: PaletteName, palette: SemanticPalette, metadata: PaletteMetadata): void;
/** Select a semantic palette by name. Falls back to the default ('crameri')
 *  if the name is not registered. In dev mode, warns on non-default fallback
 *  so missing registrations surface during development instead of silently
 *  producing the wrong colors. */
declare function getPalette(name?: PaletteName): SemanticPalette;
/** Get full palette entry (colors + metadata) by name. Returns undefined if
 *  not registered. */
declare function getPaletteEntry(name: PaletteName): PaletteEntry | undefined;
/** List all registered palette names with their metadata. Agents use this for
 *  discoverability; the manifest serializes it for non-TS hosts. */
declare function listPalettes(): {
    name: PaletteName;
    metadata: PaletteMetadata;
}[];
/** Check whether a palette name is registered. */
declare function isRegisteredPalette(name: string): boolean;
declare const CORTICAL_LAYER_COLORS: Record<string, string>;
/** Categorical neuron/population colors — batlowS (Crameri's categorical set).
 *  Distinct, CVD-friendly hues sampled from the batlow colour map at
 *  perceptually-spaced intervals. Replaces the hand-picked Tailwind set. */
declare const CATEGORICAL: readonly string[];
declare function categorical(i: number): string;
declare const OKABE_ITO: {
    readonly black: "#000000";
    readonly orange: "#e69f00";
    readonly skyBlue: "#56b4e9";
    readonly green: "#009e73";
    readonly yellow: "#f0e442";
    readonly blue: "#0072b2";
    readonly vermilion: "#d55e00";
    readonly reddishPurple: "#cc79a7";
};
declare const SYNAPSE_COLORS: {
    readonly dark: {
        readonly excitatory: "#1a3d5a";
        readonly inhibitory: "#5a3d1a";
    };
    readonly light: {
        readonly excitatory: "#4a7d9a";
        readonly inhibitory: "#9a7d4a";
    };
};
declare const AXIS_COLORS: {
    readonly lightAxisLabel: "#1f2937";
    readonly lightAxisLine: "#475569";
    readonly lightGridLine: "#cbd5e1";
    readonly darkAxisLabel: "#cbd5e1";
    readonly darkAxisLine: "#64748b";
    readonly darkGridLine: "#334155";
};
declare const TURBO_GLSL = "\nvec3 turbo(float x) {\n  x = clamp(x, 0.0, 1.0);\n  vec4 v4 = vec4(1.0, x, x * x, x * x * x);\n  vec2 v2 = v4.zw * v4.z;\n  return vec3(\n    dot(v4, vec4(0.13572138, 4.61539260, -42.66032258, 132.13108234)) + dot(v2, vec2(-152.94239396, 59.28637943)),\n    dot(v4, vec4(0.09140261, 2.19418839,   4.84296658, -14.18503333)) + dot(v2, vec2(  4.27729857,  2.82956604)),\n    dot(v4, vec4(0.10667330, 12.64194608, -60.58204836, 110.36276771)) + dot(v2, vec2(-89.90310912, 27.34824973))\n  );\n}\n";
declare const VIRIDIS_GLSL = "\nvec3 viridis(float t) {\n  t = clamp(t, 0.0, 1.0);\n  const vec3 c0 = vec3(0.2777273272234177, 0.005407344544966578, 0.3340998053353061);\n  const vec3 c1 = vec3(0.1050930431085774, 1.404613529898575, 1.384590162594685);\n  const vec3 c2 = vec3(-0.3308618287255563, 0.214847559468213, 0.09509516302823659);\n  const vec3 c3 = vec3(-4.634230498983486, -5.799100973351585, -19.33244095627987);\n  const vec3 c4 = vec3(6.228269936347081, 14.17993336680509, 56.69055260068105);\n  const vec3 c5 = vec3(4.776384997670288, -13.74514537774601, -65.35303263337234);\n  const vec3 c6 = vec3(-5.435455855934631, 4.645852612178535, 26.3124352495832);\n  return c0 + t * (c1 + t * (c2 + t * (c3 + t * (c4 + t * (c5 + t * c6)))));\n}\n";
declare const BATLOW_GLSL = "\nvec3 batlow(float t) {\n  t = clamp(t, 0.0, 1.0);\n  const vec3 stops[13] = vec3[13](\n    vec3(0.004,0.098,0.350), vec3(0.051,0.176,0.361), vec3(0.102,0.259,0.376),\n    vec3(0.153,0.353,0.376), vec3(0.227,0.420,0.329), vec3(0.322,0.455,0.290),\n    vec3(0.420,0.482,0.243), vec3(0.541,0.525,0.200), vec3(0.631,0.541,0.169),\n    vec3(0.753,0.565,0.212), vec3(0.847,0.578,0.282), vec3(0.929,0.605,0.385),\n    vec3(0.981,0.800,0.981)\n  );\n  float x = t * 12.0;\n  int i = int(floor(x));\n  float f = x - float(i);\n  if (i >= 12) return stops[12];\n  return mix(stops[i], stops[i + 1], f);\n}\n";
declare const VIK_GLSL = "\nvec3 vik(float t) {\n  t = clamp(t, 0.0, 1.0);\n  const vec3 stops[11] = vec3[11](\n    vec3(0.001,0.070,0.380), vec3(0.009,0.193,0.458), vec3(0.075,0.398,0.591),\n    vec3(0.236,0.522,0.674), vec3(0.483,0.713,0.784), vec3(0.858,0.897,0.915),\n    vec3(0.859,0.647,0.518), vec3(0.728,0.368,0.166), vec3(0.596,0.199,0.028),\n    vec3(0.436,0.068,0.026), vec3(0.350,0.000,0.030)\n  );\n  float x = t * 10.0;\n  int i = int(floor(x));\n  float f = x - float(i);\n  if (i >= 10) return stops[10];\n  return mix(stops[i], stops[i + 1], f);\n}\n";

type NeuralSceneMode = 'hero' | 'background' | 'standalone';
declare const SCENE_NAMES: readonly ["live-activity", "cortical-column", "stdp", "spike-raster", "network-topology", "voltage-trace", "phase-plane", "brunel-network", "fi-curve", "isi-distribution", "psth", "weight-histogram"];
type SceneName = (typeof SCENE_NAMES)[number];
interface NeuralSceneHandle {
    nextScene: () => void;
    setScene: (scene: SceneName) => void;
    play: () => void;
    pause: () => void;
    seek: (time: number) => void;
    setCameraPreset: (preset: CameraPresetName) => void;
}
interface NeuralSceneProps {
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
interface LayerConfig {
    layer: string;
    y: number;
    count: number;
    color: string;
    label: string;
}
interface STDPSynapse {
    preIdx: number;
    postIdx: number;
    weight: number;
    targetWeight: number;
    lastPreSpike: number;
    lastPostSpike: number;
}
type CameraPresetName = 'default' | 'top' | 'side' | 'close' | 'cinematic';
interface CameraPreset {
    name: CameraPresetName;
    position: [number, number, number];
    target: [number, number, number];
    fov?: number;
}
interface PlaybackState {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    speed: number;
}
interface SceneData {
    spikeTimes?: Float32Array;
    spikeSenders?: Float32Array;
    voltageTraces?: Float32Array;
    traceTimes?: Float32Array;
    weightSeries?: Float32Array;
    analogTraces?: {
        values: Float32Array;
        variable: string;
        units: string;
    };
    networkNodes?: {
        id: number;
        x: number;
        y: number;
        z: number;
        label: string;
    }[];
    networkEdges?: {
        source: number;
        target: number;
        weight: number;
    }[];
    vectorField?: {
        x: number;
        y: number;
        z: number;
        dx: number;
        dy: number;
        dz: number;
    }[];
}
interface SceneFraming {
    position: [number, number, number];
    target: [number, number, number];
    rotatable: boolean;
}
declare const SCENE_FRAMING: Record<SceneName, SceneFraming>;
declare const CAMERA_PRESETS: Record<CameraPresetName, CameraPreset>;

export { AXIS_COLORS as A, BATLOW_GLSL as B, CAMERA_PRESETS as C, isRegisteredPalette as D, listPalettes as E, registerPalette as F, sampleColormap as G, validatePalette as H, type LayerConfig as L, type NeuralSceneHandle as N, OKABE_ITO as O, type PaletteEntry as P, type RGB as R, SCENE_FRAMING as S, TURBO_GLSL as T, VIK_GLSL as V, CATEGORICAL as a, CORTEXEL_PALETTE as b, CORTICAL_LAYER_COLORS as c, type CameraPreset as d, type CameraPresetName as e, type ColormapName as f, type NeuralSceneMode as g, type NeuralSceneProps as h, type PaletteMetadata as i, type PaletteName as j, type PlaybackState as k, SCENE_NAMES as l, type STDPSynapse as m, SYNAPSE_COLORS as n, type SceneData as o, type SceneFraming as p, type SceneName as q, type SemanticPalette as r, VIRIDIS_GLSL as s, categorical as t, colormapGradient as u, colormapHex as v, colormapRgba as w, colormapSvgStops as x, getPalette as y, getPaletteEntry as z };
